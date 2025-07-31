import { Module } from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { WorkoutcertController } from './workoutcert.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { CertApproval } from 'src/common/entities/cert_approval.entity';
import { Follow } from 'src/common/entities/follow.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { createS3MulterConfig } from 'src/common/config/multer-s3-config';

@Module({
  imports: [
        TypeOrmModule.forFeature([User, WorkoutCert, ChallengeParticipant, ChallengeRoom, CertApproval, Follow]),
        ConfigModule, 
        MulterModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => {
            return createS3MulterConfig('workout-images', configService);
          },
          inject: [ConfigService],
        }),
      ],
  controllers: [WorkoutcertController],
  providers: [WorkoutcertService],
})
export class WorkoutcertModule {}
