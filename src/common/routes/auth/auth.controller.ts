import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. 휴대폰 SMS 인증 코드 전송
  @Post('verify-sms')
  async verifySms(@Body('phone') phone: string) {
    return this.authService.sendVerificationCode(phone);
  }
}
