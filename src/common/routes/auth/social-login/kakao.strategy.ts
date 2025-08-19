import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('KAKAO_CLIENT_ID'),
      clientSecret: configService.get('KAKAO_CLIENT_SECRET'), // Client Secret 추가
      callbackURL: configService.get('KAKAO_CALLBACK_URL'),
      scope: ['account_email', 'profile_nickname'], // 필요한 scope 추가
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const user = {
      provider: 'kakao',
      providerId: profile.id,
      name: profile.displayName,
      email: profile._json.kakao_account.email,
    };
    done(null, user);
  }
}