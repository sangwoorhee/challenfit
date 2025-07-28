import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChallengerStatus,
  ChallengeStatus,
  DurationUnit,
} from 'src/common/enum/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { User } from 'src/common/entities/user.entity';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateChallengeRoomReqDto,
  JoinChallengeRoomReqDto,
  KickParticipantReqDto,
} from './dto/req.dto';
import { ChallengeRoomFeedDto, GetChallengeRoomDetailResDto, GetChallengeRoomsResDto } from './dto/res.dto';

@Injectable()
export class ChallengeroomService {
  constructor(
    @InjectRepository(ChallengeRoom)
    private challengeRepository: Repository<ChallengeRoom>,
    @InjectRepository(ChallengeParticipant)
    private participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 1. 도전 방 생성
  async createChallengeRoom(
    user_idx: string,
    createChallengeRoomDto: CreateChallengeRoomReqDto,
  ) {
    const queryRunner =
      this.challengeRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { idx: user_idx },
      });
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 도전방 생성 제한 (한 사람이 여러 개 만들 수 없도록)
      const existingChallenge = await this.challengeRepository.findOne({
        where: {
          user: { idx: user_idx },
          status: In([ChallengeStatus.PENDING, ChallengeStatus.ONGOING]),
        },
      });
      
      if (existingChallenge) {
        throw new ConflictException('이미 진행 중이거나 대기 중인 도전방이 있습니다. 한 번에 하나의 도전방만 생성할 수 있습니다.');
      }

      // 도전방 중복 참여 방지 - 수정: 사용자가 이미 진행중인 도전이 있는지 확인
      const existingParticipant = await queryRunner.manager.findOne(ChallengeParticipant, {
        where: { 
          user: { idx: user_idx },
          status: ChallengerStatus.ONGOING
        },
        relations: ['challenge']
      });

      if (existingParticipant && 
          (existingParticipant.challenge.status === ChallengeStatus.PENDING ||
           existingParticipant.challenge.status === ChallengeStatus.ONGOING)) {
        throw new ConflictException('이미 진행 중인 도전이 있습니다.');
      }

      const challengeRoom = this.challengeRepository.create({
        ...createChallengeRoomDto,
        start_date: null,
        end_date: null,
        status: ChallengeStatus.PENDING,
        user,
        is_public: true,
        current_participants: 1, // 생성자 포함
      });

      // 도전방 저장
      const savedRoom = await queryRunner.manager.save(challengeRoom);

      // 생성자를 도전자 목록에 추가 - 상태를 PENDING으로 변경
      const participant = this.participantRepository.create({
        user,
        challenge: savedRoom,
        status: ChallengerStatus.PENDING, // ONGOING에서 PENDING으로 변경
        joined_at: new Date(),
        completed_at: null,
      });

      await queryRunner.manager.save(participant);

      await queryRunner.commitTransaction();
      return { result: 'ok', roomId: savedRoom.idx }; // roomId 추가
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('도전방 생성 실패:', error);
      throw new InternalServerErrorException(
        `도전방 생성 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 도전 방 목록조회
  async getChallengeRooms(page: number, size: number): Promise<GetChallengeRoomsResDto> {
    const [challengeRooms, totalCount] = await this.challengeRepository.findAndCount({
      where: { is_public: true },
      relations: ['user', 'user.profile'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      challengeRooms: challengeRooms.map((room) => ({
        roomId: room.idx,
        title: room.title,
        status: room.status,
        duration_unit: room.duration_unit,
        duration_value: room.duration_value,
        goal: room.goal,
        currentMemberCount: room.current_participants,
        maxMembers: room.max_participants,
        creatorProfileImageUrl: room.user?.profile?.profile_image_url || null,
      })),
    };
  }

  /// 3. 도전 방 상세조회
  async getChallengeRoomDetail(idx: string): Promise<GetChallengeRoomDetailResDto> {
    const challengeRoom = await this.challengeRepository.findOne({
      where: { idx },
      relations: [
        'user',
        'challenge_participants',
        'challenge_participants.user',
      ],
    });
    if (!challengeRoom) {
      throw new NotFoundException('도전방을 찾을 수 없습니다.');
    }
    return {
      result: 'ok',
      challengeRoom,
    };
  }
}
