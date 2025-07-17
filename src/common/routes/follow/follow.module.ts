import { Module } from '@nestjs/common';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follow } from 'src/common/entities/follow.entity';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { FollowRequest } from 'src/common/entities/follow_request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Follow, User, UserProfile, FollowRequest])],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
