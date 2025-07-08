import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ChallengerStatus,
  ChallengeStatus,
  DurationUnit,
} from 'src/common/enum/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { ChallengeRoomFeedDto, GetChallengeRoomsResDto } from './dto/res.dto';

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

      // 도전방 중복 참여 방지
      const existRoom = await queryRunner.manager.findOne(ChallengeRoom, {
        where: { idx: user_idx },
      });

      if (
        existRoom?.status === ChallengeStatus.PENDING ||
        existRoom?.status === ChallengeStatus.ONGOING
      ) {
        throw new ConflictException('도전방은 중복 참여 할 수 없습니다.');
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

      // 생성자를 도전자 목록에 자동 추가
      const participant = this.participantRepository.create({
        user, // User 엔티티 전체
        challenge: savedRoom, // ChallengeRoom 엔티티
        status: ChallengerStatus.PARTICIPATING,
        joined_at: new Date(),
        completed_at: null,
      });

      await queryRunner.manager.save(participant);

      await queryRunner.commitTransaction();
      return { result: 'ok' };
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
  async getChallengeRooms(): Promise<GetChallengeRoomsResDto> {
    const challengeRooms = await this.challengeRepository.find({
      where: { is_public: true },
      select: [
        'idx',
        'title',
        'status',
        'duration_value',
        'duration_unit',
        'goal',
        'current_participants',
        'max_participants',
      ],
      order: { created_at: 'DESC' },
    });

    return {
      result: 'ok',
      challengeRooms: challengeRooms.map((room) => ({
        roomId: room.idx,
        title: room.title,
        status: room.status,
        duration_unit: room.duration_unit,
        duration_value: room.duration_value,
        goal: room.goal,
        currentMemberCount: room.current_participants,
        maxMembers: room.max_participants,
      })),
    };
  }

  // 3. 도전 방 상세조회
  async getChallengeRoomDetail(idx: string): Promise<{result: string, data: ChallengeRoom}> {
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
      data: challengeRoom,
    };
  }
}
