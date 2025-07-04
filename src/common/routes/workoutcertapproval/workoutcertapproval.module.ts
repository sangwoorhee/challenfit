import { Module } from '@nestjs/common';
import { WorkoutcertapprovalService } from './workoutcertapproval.service';
import { WorkoutcertapprovalController } from './workoutcertapproval.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertApproval } from 'src/common/entities/cert_approval.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CertApproval, WorkoutCert, ChallengeParticipant]),
  ],
  controllers: [WorkoutcertapprovalController],
  providers: [WorkoutcertapprovalService],
})
export class WorkoutcertapprovalModule {}
