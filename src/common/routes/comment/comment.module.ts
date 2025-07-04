import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from 'src/common/entities/comment.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { User } from 'src/common/entities/user.entity';

@Module({
  imports: [
        TypeOrmModule.forFeature([Comment, WorkoutCert, User]),
      ],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
