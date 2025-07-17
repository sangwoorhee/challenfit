import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { UserSetting } from 'src/common/entities/user_setting.entity';
import { Follow } from 'src/common/entities/follow.entity';

@Module({
  imports: [
      TypeOrmModule.forFeature([User, UserProfile, UserSetting, Follow]),
    ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // UserService를 다른 모듈에서 사용할 수 있도록 export
})
export class UserModule {}
