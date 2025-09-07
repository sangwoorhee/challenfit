import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LoginReqDto, SignupReqDto } from './dto/req.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { UserSetting } from 'src/common/entities/user_setting.entity';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserProvider, UserStatus } from 'src/common/enum/enum';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from 'src/common/entities/refresh_token.entity';
import { AuthTokenResDto } from './dto/res.dto';
import { validateOrReject } from 'class-validator';
import * as jwt from 'jsonwebtoken';
import { MailerService } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserSetting)
    private readonly settingRepository: Repository<UserSetting>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  // -------------------------- SMS 인증 --------------------------
  async sendVerificationCode(
    phone: string,
  ): Promise<{ phone: string; code: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const ttlSeconds = 300;
    const cacheKey = `sms:${phone}`;

    try {
      await (this.cacheManager as any).set(cacheKey, code, { ttl: ttlSeconds });
    } catch (error) {
      console.error(`❌ SMS 코드 저장 실패: ${error.message}`);
    }
    return { phone, code };
  }

  async verifySmsCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const cacheKey = `sms:${phone}`;
    try {
      const cachedCode = await this.cacheManager.get<string>(cacheKey);
      if (!cachedCode)
        return {
          success: false,
          message: '인증 코드가 만료되었거나 존재하지 않습니다.',
        };
      if (cachedCode !== code)
        return { success: false, message: '인증 코드가 일치하지 않습니다.' };
      await this.cacheManager.del(cacheKey);
      return { success: true, message: '인증이 완료되었습니다.' };
    } catch (error) {
      console.error(` SMS 코드 검증 실패: ${error.message}`);
      return {
        success: false,
        message: '인증 코드 검증 중 오류가 발생했습니다.',
      };
    }
  }

  // -------------------------- 회원가입/로그인 --------------------------
  async signup(signupDto: SignupReqDto) {
    const { email, password, name, nickname, phone } = signupDto;
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing)
      throw new HttpException('이미 가입된 이메일입니다.', HttpStatus.CONFLICT);

    const existingNickname = await this.userRepository.findOne({
      where: { nickname },
    });
    if (existingNickname)
      throw new HttpException(
        '이미 사용 중인 닉네임입니다.',
        HttpStatus.CONFLICT,
      );

    const hashedPassword = await bcrypt.hash(password, 10);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    try {
      await validateOrReject(signupDto);

      const user = queryRunner.manager.create(User, {
        email,
        password: hashedPassword,
        name,
        nickname,
        phone,
        provider: UserProvider.LOCAL,
        status: UserStatus.ACTIVE,
      });
      savedUser = await queryRunner.manager.save(user);

      const profile = queryRunner.manager.create(UserProfile, {
        user: savedUser,
        birth_date: signupDto.birth_date,
        height: signupDto.height,
        weight: signupDto.weight,
        interest_exercises: signupDto.interest_exercises,
        exercise_purpose: signupDto.exercise_purpose,
        introduction: signupDto.introduction,
        profile_image_url: signupDto.profile_image_url,
      });
      await queryRunner.manager.save(profile);

      const setting = queryRunner.manager.create(UserSetting, {
        user: savedUser,
        marketing_opt_in: signupDto.marketing_opt_in ?? false,
        no_push_alert: signupDto.no_push_alert ?? false,
      });
      await queryRunner.manager.save(setting);

      const accessToken = this.generateAccessToken(savedUser.idx);
      const refreshToken = this.generateRefreshToken(savedUser.idx);
      const refreshEntity = queryRunner.manager.create(RefreshToken, {
        token: refreshToken,
        user: savedUser,
      });
      await queryRunner.manager.save(refreshEntity);

      await queryRunner.commitTransaction();
      return { accessToken, refreshToken, user: savedUser, profile };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`회원가입 중 오류 발생: ${error.message}`);
      throw new HttpException(
        `회원가입 중 오류 발생: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginReqDto) {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['refreshToken', 'profile'],
    });
    if (!user)
      throw new HttpException(
        '존재하지 않는 사용자입니다.',
        HttpStatus.NOT_FOUND,
      );
    if (user.status === UserStatus.BANNED)
      throw new ForbiddenException('차단된 사용자입니다.');
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch)
      throw new HttpException(
        '비밀번호가 일치하지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );

    const accessToken = this.generateAccessToken(user.idx);
    const refreshToken = this.generateRefreshToken(user.idx);
    await this.createRefreshTokenUsingUser(user.idx, refreshToken);
    return { result: 'ok', accessToken, refreshToken, user };
  }

  // -------------------------- 소셜 OAuth 공통 --------------------------
  async oauthLogin(oauthUser: any): Promise<AuthTokenResDto> {
    const rawProvider = oauthUser.provider as string;
    if (!Object.values(UserProvider).includes(rawProvider as UserProvider)) {
      throw new BadRequestException('지원하지 않는 로그인 제공자입니다.');
    }
    const provider = rawProvider as UserProvider;

    let user = await this.userRepository.findOne({
      where: {
        provider: oauthUser.provider,
        provider_uid: oauthUser.providerId,
      },
    });

    if (user) {
      if (user.status === UserStatus.BANNED)
        throw new ForbiddenException('차단된 사용자입니다.');
    } else {
      user = this.userRepository.create({
        email: oauthUser.email,
        nickname: oauthUser.nickname,
        name: oauthUser.name || oauthUser.nickname,
        phone: '',
        provider,
        provider_uid: oauthUser.providerId,
        status: UserStatus.ACTIVE,
      });
      await this.userRepository.save(user);

      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        let birth_date: Date | undefined;
        if (oauthUser.birthyear && oauthUser.birthday) {
          const year = oauthUser.birthyear;
          const monthDay = oauthUser.birthday; // MMDD
          birth_date = new Date(
            `${year}-${monthDay.substring(0, 2)}-${monthDay.substring(2, 4)}`,
          );
        }
        const profile = qr.manager.create(UserProfile, {
          user,
          profile_image_url: oauthUser.profile_image_url,
          birth_date,
        });
        await qr.manager.save(profile);
        const setting = qr.manager.create(UserSetting, { user });
        await qr.manager.save(setting);
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw new InternalServerErrorException(
          `OAuth 사용자 초기화 실패: ${e.message}`,
        );
      } finally {
        await qr.release();
      }
    }

    const accessToken = this.generateAccessToken(user.idx);
    const refreshToken = this.generateRefreshToken(user.idx);
    await this.createRefreshTokenUsingUser(user.idx, refreshToken);
    return { accessToken, refreshToken };
  }

  // 콜백 공통 처리: 앱 딥링크(code) 리다이렉트 or 웹 폴백(JSON)
  async handleOAuthCallbackAndRedirect(oauthUser: any, res: Response) {
    const tokens = await this.oauthLogin(oauthUser);

    const appLink = this.configService.get<string>('APP_DEEP_LINK'); // ex) challenfit://oauth-callback
    if (appLink && appLink.trim().length > 0) {
      const code = await this.issueOneTimeCode(tokens);
      const redirectUrl = `${appLink}?code=${encodeURIComponent(code)}`;
      return res.redirect(302, redirectUrl);
    }

    // 앱 딥링크가 없으면 웹 폴백(JSON)
    return res.json(tokens);
  }

  // 1회용 코드 발급 (기본 TTL: 60초)
  async issueOneTimeCode(tokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<string> {
    const code = randomBytes(16).toString('hex');
    const key = `oauth:code:${code}`;
    await this.cacheManager.set(key, tokens, 60); // 60초
    return code;
  }

  // 1회용 코드 소비: 토큰 반환
  async consumeOneTimeCode(code: string): Promise<AuthTokenResDto> {
    const key = `oauth:code:${code}`;
    const tokens = await this.cacheManager.get<AuthTokenResDto>(key);
    if (!tokens) throw new BadRequestException('Invalid or expired code');
    await this.cacheManager.del(key);
    return tokens;
  }

  // -------------------------- 토큰/로그아웃 --------------------------
  async refreshTokens(refreshToken: string): Promise<AuthTokenResDto> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
      if (decoded.tokenType !== 'refresh') {
        throw new HttpException(
          '유효하지 않은 토큰 타입입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const refreshTokenEntity = await this.refreshTokenRepository.findOne({
        where: { user: { idx: decoded.sub }, token: refreshToken },
        relations: ['user'],
      });
      if (!refreshTokenEntity) {
        throw new HttpException(
          '유효하지 않은 리프레시 토큰입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (refreshTokenEntity.user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('비활성화된 사용자입니다.');
      }

      const newAccessToken = this.generateAccessToken(
        refreshTokenEntity.user.idx,
      );
      const newRefreshToken = this.generateRefreshToken(
        refreshTokenEntity.user.idx,
      );
      await this.createRefreshTokenUsingUser(
        refreshTokenEntity.user.idx,
        newRefreshToken,
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new HttpException(
          '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new HttpException(
        '토큰 갱신에 실패했습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async logout(userId: string): Promise<{ message: string }> {
    try {
      await this.refreshTokenRepository.delete({ user: { idx: userId } });
      return { message: '로그아웃되었습니다.' };
    } catch (error) {
      throw new InternalServerErrorException(
        '로그아웃 처리 중 오류가 발생했습니다.',
      );
    }
  }

  // -------------------------- 공용 유틸 --------------------------
  generateAccessToken(user_idx: string) {
    const payload = { sub: user_idx, tokenType: 'access' };
    return this.jwtService.sign(payload); // JwtModule에서 secret, expiresIn 설정됨
    // ex) JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } })
  }

  generateRefreshToken(user_idx: string) {
    const payload = { sub: user_idx, tokenType: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '30d' });
  }

  private async createRefreshTokenUsingUser(
    user_idx: string,
    refreshToken: string,
  ) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      let refreshTokenEntity = await qr.manager.findOne(
        this.refreshTokenRepository.target,
        {
          where: { user: { idx: user_idx } },
        },
      );
      if (refreshTokenEntity) {
        refreshTokenEntity.token = refreshToken;
      } else {
        refreshTokenEntity = this.refreshTokenRepository.create({
          user: { idx: user_idx },
          token: refreshToken,
        });
      }
      await qr.manager.save(refreshTokenEntity);
      await qr.commitTransaction();
    } catch (error) {
      await qr.rollbackTransaction();
      throw new InternalServerErrorException(
        `리프레시 토큰 저장 실패: ${error.message}`,
      );
    } finally {
      await qr.release();
    }
  }

  async sendEmailVerification(user: User): Promise<void> {
    const token = uuidv4();
    await this.cacheManager.set(`email_verification:${token}`, user.idx, 3600);
    const verifyUrl = `${this.configService.get('FRONTEND_ORIGIN')}/auth/verify-email?token=${token}`;
    await this.mailerService.sendMail({
      to: user.email,
      from: this.configService.get('MAIL_FROM'),
      subject: '이메일 인증 요청',
      html: `<p>다음 링크를 클릭하여 이메일 인증을 완료하세요:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const userIdx = await this.cacheManager.get<string>(
      `email_verification:${token}`,
    );
    if (!userIdx)
      throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);
    await this.cacheManager.del(`email_verification:${token}`);
  }
}
