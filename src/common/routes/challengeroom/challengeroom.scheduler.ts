import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengeStatus } from 'src/common/enum/enum';

@Injectable()
export class ChallengeScheduler {
  constructor(
    @InjectRepository(ChallengeRoom)
    private readonly challengeRoomRepository: Repository<ChallengeRoom>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Seoul' })
  async updateChallengeRoomStatus() {
    const now = new Date();
    const pendingRooms = await this.challengeRoomRepository.find({ where: { status: ChallengeStatus.PENDING } });
    for (const room of pendingRooms) {
      if (new Date(room.start_date) <= now) {
        room.status = ChallengeStatus.ONGOING;
        await this.challengeRoomRepository.save(room);
      }
    }

    const ongoingRooms = await this.challengeRoomRepository.find({ where: { status: ChallengeStatus.ONGOING } });
    for (const room of ongoingRooms) {
      if (new Date(room.end_date) < now) {
        room.status = ChallengeStatus.COMPLETED;
        await this.challengeRoomRepository.save(room);
      }
    }
  }
}