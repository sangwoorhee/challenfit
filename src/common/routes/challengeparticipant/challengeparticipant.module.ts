import { Module } from '@nestjs/common';
import { ChallengeparticipantService } from './challengeparticipant.service';
import { ChallengeparticipantController } from './challengeparticipant.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChallengeRoom, ChallengeParticipant, User]),
  ],
  controllers: [ChallengeparticipantController],
  providers: [ChallengeparticipantService],
  exports: [ChallengeparticipantService, TypeOrmModule],
})
export class ChallengeparticipantModule {}
