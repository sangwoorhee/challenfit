import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChallengeStatus, ChallengerStatus } from 'src/common/enum/enum';

interface ParticipantInfo {
  userIdx: string;
  nickname: string;
  profileImageUrl?: string;
  joinedAt: Date;
  status: string;
}

@Injectable()
export class EntryService {
  private readonly CACHE_TTL = 3600; // 1시간
  private readonly PARTICIPANTS_CACHE_PREFIX = 'entry:participants:';
  private readonly logger = new Logger('EntryService');

  constructor(
    @InjectRepository(ChallengeParticipant)
    private challengeParticipantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(ChallengeRoom)
    private challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 토큰 검증
  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return await this.getUserInfo(payload.sub);
    } catch {
      return null;
    }
  }

  // 유저 정보 조회
  async getUserInfo(userIdx: string): Promise<any> {
    const cacheKey = `user:info:${userIdx}`;
    let userInfo = await this.safeGetCache(cacheKey);
    if (!userInfo) {
      const user = await this.userRepository.findOne({
        where: { idx: userIdx },
        select: ['idx', 'nickname', 'email'],
      });
      if (user) {
        userInfo = user;
        await this.safeSetCache(cacheKey, userInfo, this.CACHE_TTL);
      }
    }
    return userInfo;
  }

  // 참여 생성
  async createParticipant(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
    try {
      const challengeRoom = await this.challengeRoomRepository.findOne({
        where: { idx: challengeRoomIdx },
      });
      if (!challengeRoom) throw new HttpException('도전방을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);

      if (challengeRoom.status !== ChallengeStatus.PENDING) {
        throw new HttpException('대기중인 도전방에만 참여할 수 있습니다.', HttpStatus.BAD_REQUEST);
      }

      if (challengeRoom.current_participants >= challengeRoom.max_participants) {
        throw new HttpException('도전방 정원이 초과되었습니다.', HttpStatus.BAD_REQUEST);
      }

      const existingParticipant = await this.challengeParticipantRepository.findOne({
        where: { challenge: { idx: challengeRoomIdx }, user: { idx: userIdx } },
      });
      if (existingParticipant) {
        throw new HttpException('이미 참여중인 도전방입니다.', HttpStatus.BAD_REQUEST);
      }

      const participant = this.challengeParticipantRepository.create({ status: ChallengerStatus.ONGOING });
      participant.challenge = { idx: challengeRoomIdx } as ChallengeRoom;
      participant.user = { idx: userIdx } as User;

      const savedParticipant = await this.challengeParticipantRepository.save(participant);
      challengeRoom.current_participants += 1;
      await this.challengeRoomRepository.save(challengeRoom);
      await this.invalidateParticipantsCache(challengeRoomIdx);

      const participantWithUser = await this.challengeParticipantRepository.findOne({
        where: { idx: savedParticipant.idx },
        relations: ['user', 'user.profile', 'challenge'],
        select: {
          idx: true,
          joined_at: true,
          status: true,
          user: { idx: true, nickname: true, profile: { profile_image_url: true } },
          challenge: { current_participants: true, max_participants: true },
        },
      });

      if (!participantWithUser) throw new HttpException('참여자 정보를 찾을 수 없습니다.', HttpStatus.INTERNAL_SERVER_ERROR);
      return participantWithUser;
    } catch (error) {
      this.logger.error(`Create participant error: ${error.message}`);
      throw error;
    }
  }

  // 참여 취소
  async removeParticipant(challengeRoomIdx: string, userIdx: string): Promise<boolean> {
    try {
      const participant = await this.challengeParticipantRepository.findOne({
        where: { challenge: { idx: challengeRoomIdx }, user: { idx: userIdx } },
        relations: ['challenge'],
      });
      if (!participant) throw new HttpException('참여중인 도전방이 아닙니다.', HttpStatus.NOT_FOUND);

      if (participant.challenge.status !== ChallengeStatus.PENDING) {
        throw new HttpException('진행중이거나 종료된 도전은 참여 취소할 수 없습니다.', HttpStatus.BAD_REQUEST);
      }

      await this.challengeParticipantRepository.remove(participant);
      const challengeRoom = await this.challengeRoomRepository.findOne({ where: { idx: challengeRoomIdx } });
      if (challengeRoom) {
        challengeRoom.current_participants = Math.max(0, challengeRoom.current_participants - 1);
        await this.challengeRoomRepository.save(challengeRoom);
      }

      await this.invalidateParticipantsCache(challengeRoomIdx);
      return true;
    } catch (error) {
      this.logger.error(`Remove participant error: ${error.message}`);
      throw error;
    }
  }

  // 참가자 목록 조회
  async getChallengeParticipants(challengeRoomIdx: string): Promise<ParticipantInfo[]> {
    const cacheKey = `${this.PARTICIPANTS_CACHE_PREFIX}${challengeRoomIdx}`;
    let participants = await this.safeGetCache<ParticipantInfo[]>(cacheKey);

    if (!participants) {
      const participantList = await this.challengeParticipantRepository.find({
        where: { challenge: { idx: challengeRoomIdx } },
        relations: ['user', 'user.profile'],
        order: { joined_at: 'ASC' },
        select: {
          idx: true,
          joined_at: true,
          status: true,
          user: { idx: true, nickname: true, profile: { profile_image_url: true } },
        },
      });

      participants = participantList.map(participant => ({
        userIdx: participant.user.idx,
        nickname: participant.user.nickname,
        profileImageUrl: participant.user.profile?.profile_image_url || undefined,
        joinedAt: participant.joined_at,
        status: participant.status,
      }));

      await this.safeSetCache(cacheKey, participants, 60);
    }

    return participants || [];
  }

  // 도전방 정보 조회
  async getChallengeRoomInfo(challengeRoomIdx: string): Promise<ChallengeRoom> {
    const challengeRoom = await this.challengeRoomRepository.findOne({ where: { idx: challengeRoomIdx } });
    if (!challengeRoom) throw new HttpException('도전방을 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    return challengeRoom;
  }

  // 참여 여부 확인
  async isParticipant(userIdx: string, challengeRoomIdx: string): Promise<boolean> {
    const participant = await this.challengeParticipantRepository.findOne({
      where: { user: { idx: userIdx }, challenge: { idx: challengeRoomIdx } },
    });
    return !!participant;
  }

  // 참가자 목록 캐시 무효화
  private async invalidateParticipantsCache(challengeRoomIdx: string): Promise<void> {
    try {
      const cacheKey = `${this.PARTICIPANTS_CACHE_PREFIX}${challengeRoomIdx}`;
      await this.safeDelCache(cacheKey);
      this.logger.debug(`Participants cache invalidated for room ${challengeRoomIdx}`);
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
    }
  }

  // 캐시 가져오기
  private async safeGetCache<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      return result ?? null;
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}:`, error.message);
      return null;
    }
  }

  // 캐시 설정
  private async safeSetCache(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await (this.cacheManager as any).set(key, value, { ttl: ttl || this.CACHE_TTL });
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${key}:`, error.message);
    }
  }

  // 캐시 삭제
  private async safeDelCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for key ${key}:`, error.message);
    }
  }
}