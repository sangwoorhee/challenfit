import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { WorkoutCert } from 'src/common/entities/workout-cert.entity';

@Controller('workoutcert')
export class WorkoutcertController {
  constructor(private readonly workoutcertService: WorkoutcertService) {}

  // 1. 내가 참가한 모든 도전방에서의 인증글(workout-cert)을 최신순으로 조회
  // http://localhost:3000/workoutcert/my
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyWorkoutCerts(@User() user: UserAfterAuth): Promise<WorkoutCert[]> {
    return await this.workoutcertService.getWorkoutCertsByUser(user.idx);
  }
}

