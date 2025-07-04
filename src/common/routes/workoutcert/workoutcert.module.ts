import { Module } from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { WorkoutcertController } from './workoutcert.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { WorkoutCert } from 'src/common/entities/workout-cert.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';

@Module({
  imports: [
        TypeOrmModule.forFeature([User, WorkoutCert, ChallengeParticipant, ChallengeRoom]),
      ],
  controllers: [WorkoutcertController],
  providers: [WorkoutcertService],
})
export class WorkoutcertModule {}
