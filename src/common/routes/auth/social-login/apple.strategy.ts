import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('APPLE_CLIENT_ID'),
      teamID: configService.get('APPLE_TEAM_ID'),
      keyID: configService.get('APPLE_KEY_ID'),
      privateKey: configService.get('APPLE_PRIVATE_KEY'),
      callbackURL: configService.get('APPLE_CALLBACK_URL'),
      scope: ['name', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const user = {
      provider: 'apple',
      providerId: profile.id,
      name: profile.name,
      email: profile.email,
    };
    done(null, user);
  }
}