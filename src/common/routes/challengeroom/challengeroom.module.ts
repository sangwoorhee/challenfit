import { Module } from '@nestjs/common';
import { ChallengeroomService } from './challengeroom.service';
import { ChallengeroomController } from './challengeroom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengeScheduler } from './challengeroom.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeRoom, ChallengeParticipant, User]),
  ],
  controllers: [ChallengeroomController],
  providers: [ChallengeroomService, ChallengeScheduler],
})
export class ChallengeroomModule {}
