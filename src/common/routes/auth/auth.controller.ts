import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginReqDto, SignupReqDto, VerifySmsCodeReqDto } from './dto/req.dto';
import { AuthTokenResDto } from './dto/res.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { JwtRefreshInterceptor } from 'src/common/interceptor/jwt-refresh.interceptor';

@ApiTags('인증/인가')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. 휴대폰 SMS 인증 코드 전송
  @Post('verify-sms')
  @ApiOperation({
    summary: '휴대폰 SMS 인증 코드 전송',
    description: 'POST : /auth/verify-sms',
  })
  async verifySms(@Body('phone') phone: string) {
    return await this.authService.sendVerificationCode(phone);
  }

  // 1-2. 휴대폰 SMS 인증 코드 검증
  @Post('verify-sms-code')
  @ApiOperation({
    summary: '휴대폰 SMS 인증 코드 검증',
    description: 'POST : /auth/verify-sms-code',
  })
  async verifySmsCode(@Body() dto: VerifySmsCodeReqDto) {
    return await this.authService.verifySmsCode(dto.phone, dto.code);
  }

  // 2. 회원가입
  @Post('signup')
  @ApiOperation({
    summary: '회원가입 (E-mail, PassWword)',
    description: 'POST : /auth/signup',
  })
  async signup(@Body() signupDto: SignupReqDto) {
    return await this.authService.signup(signupDto);
  }

  // 3. 로그인
  @Post('login')
  @ApiOperation({
    summary: '로그인 (E-mail, PassWword)',
    description: 'POST : /auth/login',
  })
  async login(@Body() loginDto: LoginReqDto): Promise<AuthTokenResDto> {
    return await this.authService.login(loginDto);
  }

  // 4. 이메일 인증
  @Get('verify-email')
  @ApiOperation({
    summary: '이메일 인증',
    description: 'GET : /auth/verify-email',
  })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: '이메일 인증이 완료되었습니다.' };
  }

  // 5. 카카오 로그인 시작
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인', description: 'GET : /auth/kakao' })
  kakaoLogin() {}

  // 5-1. 카카오 콜백 → 앱 딥링크(code)로 리다이렉트 (웹 폴백 지원)
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 로그인 콜백',
    description: 'GET : /auth/kakao/callback',
  })
  async kakaoCallback(@User() user: any, @Res() res: Response) {
    return this.authService.handleOAuthCallbackAndRedirect(user, res);
  }

  // 6. 네이버 로그인
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인', description: 'GET : /auth/naver' })
  naverLogin() {}

  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({
    summary: '네이버 로그인 콜백',
    description: 'GET : /auth/naver/callback',
  })
  async naverCallback(@User() user: any, @Res() res: Response) {
    return this.authService.handleOAuthCallbackAndRedirect(user, res);
  }

  // 7. 구글 로그인
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '구글 로그인', description: 'GET : /auth/google' })
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: '구글 로그인 콜백',
    description: 'GET : /auth/google/callback',
  })
  async googleCallback(@User() user: any, @Res() res: Response) {
    return this.authService.handleOAuthCallbackAndRedirect(user, res);
  }

  // 8. 애플 로그인
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: '애플 로그인', description: 'GET : /auth/apple' })
  appleLogin() {}

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({
    summary: '애플 로그인 콜백',
    description: 'GET : /auth/apple/callback',
  })
  async appleCallback(@User() user: any, @Res() res: Response) {
    return this.authService.handleOAuthCallbackAndRedirect(user, res);
  }

  // 9. 토큰 갱신
  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신', description: 'POST : /auth/refresh' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<AuthTokenResDto> {
    return await this.authService.refreshTokens(refreshToken);
  }

  // 10. 로그아웃
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(JwtRefreshInterceptor)
  @ApiOperation({
    summary: '로그아웃 (리프레시 토큰 삭제)',
    description: 'POST : /auth/logout',
  })
  async logout(@User() user: UserAfterAuth): Promise<{ message: string }> {
    return await this.authService.logout(user.idx);
  }

  // 11. (모바일) 일회용 code → 토큰 교환
  @Post('exchange')
  @ApiOperation({
    summary: 'OAuth 일회용 코드 교환',
    description: 'POST : /auth/exchange',
  })
  async exchange(@Body('code') code: string): Promise<AuthTokenResDto> {
    return await this.authService.consumeOneTimeCode(code);
  }
}
