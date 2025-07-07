import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import {
  ChallengerStatus,
  ChallengeStatus,
  DurationUnit,
} from 'src/common/enum/enum';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ChallengeparticipantService {
  constructor(
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(ChallengeRoom)
    private readonly challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // 2. 도전 참가
  async participateChallengeRoom(
    challengeRoomIdx: string,
    userIdx: string,
  ): Promise<ChallengeParticipant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const challengeRoom = await queryRunner.manager.findOne(ChallengeRoom, {
        where: { idx: challengeRoomIdx },
      });

      if (!challengeRoom || !challengeRoom.is_public) {
        throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { idx: userIdx },
      });
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 현재 참여자 수 증가
      challengeRoom.current_participants += 1;

      const participant = this.participantRepository.create({
        user,
        challenge: challengeRoom,
        status: ChallengerStatus.PARTICIPATING,
        joined_at: new Date(),
        completed_at: null,
      });

      const savedParticipant = await queryRunner.manager.save(participant);

      // 최대 인원 도달 시 챌린지 시작 처리
      if (
        challengeRoom.current_participants >= challengeRoom.max_participants &&
        challengeRoom.status === ChallengeStatus.PENDING
      ) {
        const now = new Date();
        const unitToDays = {
          [DurationUnit.DAY]: 1,
          [DurationUnit.WEEK]: 7,
          [DurationUnit.MONTH]: 30,
        };
        const days =
          challengeRoom.duration_value *
          unitToDays[challengeRoom.duration_unit];
        challengeRoom.start_date = now;
        challengeRoom.end_date = new Date(now.getTime() + days * 86400000);
        challengeRoom.status = ChallengeStatus.ONGOING;
      }

      await queryRunner.manager.save(challengeRoom);
      await queryRunner.commitTransaction();

      return savedParticipant;
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `도전 방 입장 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 도전 참가 취소
  async cancelParticipation(
    challengeRoomIdx: string,
    userIdx: string,
  ): Promise<ChallengeParticipant> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const challengeRoom = await queryRunner.manager.findOne(ChallengeRoom, {
        where: { idx: challengeRoomIdx },
      });
      if (!challengeRoom || !challengeRoom.is_public) {
        throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
      }

      const user = await this.userRepository.findOne({
        where: { idx: userIdx },
      });
      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      const existingParticipant = await queryRunner.manager.findOne(
        ChallengeParticipant,
        {
          where: {
            user: { idx: userIdx },
            challenge: { idx: challengeRoomIdx },
          },
        },
      );

      if (!existingParticipant) {
        throw new NotFoundException('도전방에 입장하지 않았습니다.');
      }

      if (existingParticipant.status !== ChallengerStatus.PARTICIPATING) {
        throw new ConflictException('취소할 수 있는 상태가 아닙니다.');
      }

      existingParticipant.status = ChallengerStatus.PENDING;
      existingParticipant.completed_at = null;

      // current_participants 감소 (참가 취소 시)
      challengeRoom.current_participants -= 1;

      await queryRunner.manager.save(existingParticipant);
      await queryRunner.manager.save(challengeRoom);
      await queryRunner.commitTransaction();
      return existingParticipant;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`);
      throw new InternalServerErrorException(
        `도전 방 입장 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
