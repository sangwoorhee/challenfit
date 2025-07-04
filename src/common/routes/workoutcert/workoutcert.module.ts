import { Module } from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { WorkoutcertController } from './workoutcert.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { CertApproval } from 'src/common/entities/cert_approval.entity';

@Module({
  imports: [
        TypeOrmModule.forFeature([User, WorkoutCert, ChallengeParticipant, ChallengeRoom, CertApproval]),
      ],
  controllers: [WorkoutcertController],
  providers: [WorkoutcertService],
})
export class WorkoutcertModule {}
