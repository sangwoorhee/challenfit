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
      scope: [
        'account_email', // 이메일 - User.email
        'profile_nickname', // 닉네임 - User.nickname
        'profile_image', // 프로필 이미지 - UserProfile.profile_image_url
        // 'birthday',               // 생년월일 - UserProfile.birth_date
      ], // 기존 테이블 컬럼에 매핑 가능한 스코프만
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    const kakaoAccount = profile._json.kakao_account;
    const properties = profile._json.properties;

    const user = {
      provider: 'kakao',
      providerId: profile.id,
      name: profile.displayName,
      nickname: properties?.nickname || profile.displayName,
      email: kakaoAccount?.email,
      // 기존 테이블 컬럼에 매핑할 정보들만
      profile_image_url:
        properties?.profile_image || properties?.thumbnail_image,
      birthday: kakaoAccount?.birthday, // MMDD 형태
      birthyear: kakaoAccount?.birthyear, // YYYY 형태
    };
    done(null, user);
  }
}
