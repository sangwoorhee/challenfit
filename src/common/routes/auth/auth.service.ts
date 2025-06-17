import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // 1. 휴대폰 SMS 인증 코드 전송
    async sendVerificationCode(phone: string): Promise<{ phone: string; code: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자 코드

    const ttlSeconds = 180; // 3분 동안 유효
    await this.cacheManager.set(`sms:${phone}`, code, ttlSeconds);

    return {
      phone,
      code, // 실제 서비스에서는 반환하지 않음
    };
  }
}
