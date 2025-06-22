import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginReqDto, SignupReqDto } from './dto/req.dto';
import { AuthTokenResDto } from './dto/res.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. 휴대폰 SMS 인증 코드 전송
  @Post('verify-sms')
  async verifySms(@Body('phone') phone: string) {
    return this.authService.sendVerificationCode(phone);
  }

  // 2. 회원가입
  @Post('signup')
  async signup(@Body() signupDto: SignupReqDto) {
    return this.authService.signup(signupDto);
  }

  // 3. 로그인 (E-mail, PassWword)
  @Post('login')
  async login(@Body() loginDto: LoginReqDto): Promise<AuthTokenResDto> {
    return this.authService.login(loginDto);
  }
}
