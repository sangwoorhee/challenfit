import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeController } from './like.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Like } from 'src/common/entities/like.entity';
import { Comment } from 'src/common/entities/comment.entity';
import { User } from 'src/common/entities/user.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { Ranking } from 'src/common/entities/ranking.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like, Comment, User, WorkoutCert, Ranking]),
  ],
  controllers: [LikeController],
  providers: [LikeService],
})
export class LikeModule {}
