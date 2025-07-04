import { Module } from '@nestjs/common';
import { WorkoutcertapprovalService } from './workoutcertapproval.service';
import { WorkoutcertapprovalController } from './workoutcertapproval.controller';

@Module({
  controllers: [WorkoutcertapprovalController],
  providers: [WorkoutcertapprovalService],
})
export class WorkoutcertapprovalModule {}
