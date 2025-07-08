import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengerStatus, ChallengeStatus } from 'src/common/enum/enum';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';

@Injectable()
export class ChallengeScheduler {
  constructor(
    @InjectRepository(ChallengeRoom)
    private readonly challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Seoul' })
  async updateChallengeRoomStatus() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const now = new Date();
    try {
      // 1. PENDING -> ONGOING 상태 변경
      const pendingRooms = await this.challengeRoomRepository.find({
        where: { status: ChallengeStatus.PENDING },
      });

      for (const room of pendingRooms) {
        if (room.start_date && new Date(room.start_date) <= now) {
          room.status = ChallengeStatus.ONGOING;
          await this.challengeRoomRepository.save(room);
        }
      }

      // 2. ONGOING -> COMPLETED 상태 변경 (도전방 + 참가자 모두)
      const ongoingRooms = await this.challengeRoomRepository.find({
        where: { status: ChallengeStatus.ONGOING },
        relations: ['challenge_participants'],
      });

      for (const room of ongoingRooms) {
        if (room.end_date && new Date(room.end_date) < now) {
          // 도전방 상태 변경
          room.status = ChallengeStatus.COMPLETED;
          await this.challengeRoomRepository.save(room);

          // 해당 도전방의 모든 참가자 상태를 COMPLETED로 변경
          await this.participantRepository.update(
            {
              challenge: { idx: room.idx },
              status: ChallengerStatus.PARTICIPATING,
            },
            {
              status: ChallengerStatus.COMPLETED,
              completed_at: new Date(),
            },
          );
        }
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`);
      throw new InternalServerErrorException(`${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
