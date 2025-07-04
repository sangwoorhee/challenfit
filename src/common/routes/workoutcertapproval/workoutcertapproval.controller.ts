import { Controller } from '@nestjs/common';
import { WorkoutcertapprovalService } from './workoutcertapproval.service';

@Controller('workoutcertapproval')
export class WorkoutcertapprovalController {
  constructor(private readonly workoutcertapprovalService: WorkoutcertapprovalService) {}
}
