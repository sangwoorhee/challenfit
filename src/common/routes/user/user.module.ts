import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { UserSetting } from 'src/common/entities/user_setting.entity';
import { Follow } from 'src/common/entities/follow.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { createS3MulterConfig } from 'src/common/config/multer-s3-config';

@Module({
  imports: [
      TypeOrmModule.forFeature([User, UserProfile, UserSetting, Follow]),
      ConfigModule,
      MulterModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => {
          return createS3MulterConfig('auth', configService);
        },
        inject: [ConfigService],
      }),
    ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // UserService를 다른 모듈에서 사용할 수 있도록 export
})
export class UserModule {}
