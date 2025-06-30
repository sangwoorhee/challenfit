import { Module } from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { WorkoutcertController } from './workoutcert.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { WorkoutCert } from 'src/common/entities/workout-cert.entity';

@Module({
  imports: [
        TypeOrmModule.forFeature([User, WorkoutCert]),
      ],
  controllers: [WorkoutcertController],
  providers: [WorkoutcertService],
})
export class WorkoutcertModule {}
