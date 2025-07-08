import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { UserSetting } from 'src/common/entities/user_setting.entity';
import { JwtModule } from '@nestjs/jwt';
import { RefreshToken } from 'src/common/entities/refresh_token.entity';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt/jwt.strategy';
import { KakaoStrategy } from './social-login/kakao.strategy';
import { NaverStrategy } from './social-login/naver.strategy';
import { GoogleStrategy } from './social-login/google.strategy';
import { AppleStrategy } from './social-login/apple.strategy';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, UserProfile, UserSetting, RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          global: true,
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: '1d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    KakaoStrategy,
    NaverStrategy,
    GoogleStrategy,
    AppleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
