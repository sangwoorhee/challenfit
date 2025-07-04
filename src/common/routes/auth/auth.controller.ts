import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginReqDto, SignupReqDto } from './dto/req.dto';
import { AuthTokenResDto } from './dto/res.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/common/decorators/user.decorator';

@ApiTags('인증/인가')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1. 휴대폰 SMS 인증 코드 전송
  // POST : http://localhost:3000/auth/verify-sms
  @Post('verify-sms')
  @ApiOperation({
    summary: '휴대폰 SMS 인증 코드 전송',
    description: 'POST : http://localhost:3000/auth/verify-sms',
  })
  async verifySms(@Body('phone') phone: string) {
    return await this.authService.sendVerificationCode(phone);
  }

  // 2. 회원가입 (E-mail, PassWord)
  // POST : http://localhost:3000/auth/signup
  @Post('signup')
  @ApiOperation({
    summary: '회원가입 (E-mail, PassWword)',
    description: 'POST : http://localhost:3000/auth/signup',
  })
  async signup(@Body() signupDto: SignupReqDto) {
    return await this.authService.signup(signupDto);
  }

  // 3. 로그인 (E-mail, PassWord)
  // POST : http://localhost:3000/auth/login
  @Post('login')
  @ApiOperation({
    summary: '로그인 (E-mail, PassWword)',
    description: 'POST : http://localhost:3000/auth/login',
  })
  async login(@Body() loginDto: LoginReqDto): Promise<AuthTokenResDto> {
    return await this.authService.login(loginDto);
  }

  // 4. 회원가입 시 이메일 인증
  // GET : http://localhost:3000/auth/verify-email
  @Get('verify-email')
  @ApiOperation({ 
    summary: '이메일 인증', 
    description: 'GET : http://localhost:3000/auth/verify-email' 
  })
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: '이메일 인증이 완료되었습니다.' };
  }

  // 5. 카카오 로그인
  // GET : http://localhost:3000/auth/kakao
  // GET : http://localhost:3000/auth/kakao/callback
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 로그인',
    description: 'GET : http://localhost:3000/auth/kakao',
  })
  kakaoLogin() {
    // Passport가 자동으로 처리
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 로그인 콜백',
    description: 'GET : http://localhost:3000/auth/kakao/callback',
  })
  async kakaoCallback(@User() user) {
    return await this.authService.oauthLogin(user);
  }

  // 6. 네이버 로그인
  // GET : http://localhost:3000/auth/naver
  // GET : http://localhost:3000/auth/naver/callback
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({
    summary: '네이버 로그인',
    description: 'GET : http://localhost:3000/auth/naver',
  })
  naverLogin() {
    // Passport가 자동으로 처리
  }

  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({
    summary: '네이버 로그인 콜백',
    description: 'GET : http://localhost:3000/auth/naver/callback',
  })
  async naverCallback(@User() user) {
    return await this.authService.oauthLogin(user);
  }

  // 7. 구글 로그인
  // GET : http://localhost:3000/auth/google
  // GET : http://localhost:3000/auth/google/callback
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: '구글 로그인',
    description: 'GET : http://localhost:3000/auth/google',
  })
  googleLogin() {
    // Passport가 자동으로 처리
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: '구글 로그인 콜백',
    description: 'GET : http://localhost:3000/auth/google/callback',
  })
  async googleCallback(@User() user) {
    return await this.authService.oauthLogin(user);
  }

  // 8. 애플 로그인
  // GET : http://localhost:3000/auth/apple
  // GET : http://localhost:3000/auth/apple/callback
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({
    summary: '애플 로그인',
    description: 'GET : http://localhost:3000/auth/apple',
  })
  appleLogin() {
    // Passport가 자동으로 처리
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({
    summary: '애플 로그인 콜백',
    description: 'GET : http://localhost:3000/auth/apple/callback',
  })
  async appleCallback(@User() user) {
    return await this.authService.oauthLogin(user);
  }
}
