import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginReqDto, SignupReqDto } from './dto/req.dto';
import { AuthTokenResDto } from './dto/res.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. 휴대폰 SMS 인증 코드 전송
  // http://localhost:3000/auth/verify-sms
  @Post('verify-sms')
  @ApiOperation({
    summary: '휴대폰 SMS 인증 코드 전송',
    description: 'POST : http://localhost:3000/auth/verify-sms',
  })
  async verifySms(@Body('phone') phone: string) {
    return this.authService.sendVerificationCode(phone);
  }

  // 2. 회원가입 (E-mail, PassWord)
  // http://localhost:3000/auth/signup
  @Post('signup')
  @ApiOperation({
    summary: '회원가입 (E-mail, PassWword)',
    description: 'POST : http://localhost:3000/auth/signup',
  })
  async signup(@Body() signupDto: SignupReqDto) {
    return this.authService.signup(signupDto);
  }

  // 3. 로그인 (E-mail, PassWord)
  // http://localhost:3000/auth/login
  @Post('login')
  @ApiOperation({
    summary: '로그인 (E-mail, PassWword)',
    description: 'POST : http://localhost:3000/auth/login',
  })
  async login(@Body() loginDto: LoginReqDto): Promise<AuthTokenResDto> {
    return this.authService.login(loginDto);
  }
}
