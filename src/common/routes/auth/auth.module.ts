import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { UserSetting } from 'src/common/entities/user_setting.entity';
import { JwtModule } from '@nestjs/jwt';
import { RefreshToken } from 'src/common/entities/refresh_token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserSetting, RefreshToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '6h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
