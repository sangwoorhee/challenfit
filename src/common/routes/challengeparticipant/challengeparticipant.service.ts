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
import { DataSource, In, Repository } from 'typeorm';

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

  async getActiveParticipation(
    userIdx: string,
  ): Promise<ChallengeParticipant | null> {
    const activeParticipant = await this.participantRepository.findOne({
      where: {
        user: { idx: userIdx },
        status: In([ChallengerStatus.ONGOING, ChallengerStatus.PENDING]),
      },
      relations: ['challenge'],
      order: {
        joined_at: 'DESC',
      },
    });

    console.log(activeParticipant);

    // 도전방 상태가 '진행중'인 경우에만 리턴
    if (activeParticipant && activeParticipant.challenge) {
      const challengeRoom = await this.challengeRoomRepository.findOne({
        where: { idx: activeParticipant.challenge.idx },
      });

      if (
        challengeRoom &&
        (challengeRoom.status === ChallengeStatus.ONGOING ||
          challengeRoom.status === ChallengeStatus.PENDING)
      ) {
        return activeParticipant;
      }
    }

    return null;
  }

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

      // 이미 참가한 도전방인지 확인
      const existingParticipant = await queryRunner.manager.findOne(
        ChallengeParticipant,
        {
          where: {
            user: { idx: userIdx },
            challenge: { idx: challengeRoomIdx },
          },
        },
      );

      if (existingParticipant) {
        throw new ConflictException('이미 참가한 도전방입니다.');
      }

      // 현재 참여자 수 증가
      challengeRoom.current_participants += 1;

      // 도전방 상태에 따라 참가자 상태 결정
      const participantStatus =
        challengeRoom.status === ChallengeStatus.ONGOING
          ? ChallengerStatus.ONGOING
          : ChallengerStatus.PENDING;

      const participant = this.participantRepository.create({
        user,
        challenge: challengeRoom,
        status: participantStatus, // 도전방 상태에 따라 설정
        joined_at: new Date(),
        completed_at: null,
      });

      const savedParticipant = await queryRunner.manager.save(participant);

      // 최대 인원 도달 시 챌린지 시작 처리
      if (
        challengeRoom.current_participants >= challengeRoom.max_participants &&
        challengeRoom.status === ChallengeStatus.PENDING
      ) {
        // 도전방 상태를 ONGOING으로 변경
        challengeRoom.status = ChallengeStatus.ONGOING;

        // 도전방 시작일시 및 종료일시 설정
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

        // 해당 도전방의 모든 PENDING 참가자 상태를 ONGOING으로 변경
        await queryRunner.manager.update(
          ChallengeParticipant,
          {
            challenge: { idx: challengeRoomIdx },
            status: ChallengerStatus.PENDING,
          },
          {
            status: ChallengerStatus.ONGOING,
          },
        );
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

      // PENDING 또는 ONGOING 상태에서만 취소 가능
      if (existingParticipant.status === ChallengerStatus.COMPLETED) {
        throw new ConflictException('완료된 도전은 취소할 수 없습니다.');
      }

      // 도전방이 이미 시작된 경우 취소 불가
      if (challengeRoom.status === ChallengeStatus.ONGOING) {
        throw new ConflictException('이미 시작된 도전은 취소할 수 없습니다.');
      }

      // 참가 취소 - 참가자 삭제
      await queryRunner.manager.remove(existingParticipant);

      // current_participants 감소
      challengeRoom.current_participants -= 1;

      await queryRunner.manager.save(challengeRoom);
      await queryRunner.commitTransaction();
      return existingParticipant;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`);
      throw new InternalServerErrorException(
        `도전 방 참가 취소 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
