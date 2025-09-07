import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
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
import { ForbiddenException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    // REDIS Cache
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    // DB
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  // 1. 휴대폰 SMS 인증 코드 전송
  async sendVerificationCode(
    phone: string,
  ): Promise<{ phone: string; code: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자 코드

    const ttlSeconds = 300; // 5분 동안 유효
    const cacheKey = `sms:${phone}`;

    console.log(
      `🔍 SMS 코드 저장 시도: ${cacheKey} = ${code}, TTL: ${ttlSeconds}초`,
    );

    try {
      await (this.cacheManager as any).set(cacheKey, code, { ttl: ttlSeconds });
      console.log(`✅ SMS 코드 저장 성공: ${cacheKey}`);

      // 저장 후 즉시 확인
      const saved = await this.cacheManager.get(cacheKey);
      console.log(`🔍 저장 확인: ${cacheKey} = ${saved}`);
    } catch (error) {
      console.error(`❌ SMS 코드 저장 실패: ${error.message}`);
    }

    return {
      phone,
      code,
    };
  }

  // 1-2. 휴대폰 SMS 인증 코드 검증
  async verifySmsCode(
    phone: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const cacheKey = `sms:${phone}`;

    console.log(`🔍 SMS 코드 조회 시도: ${cacheKey}, 입력 코드: ${code}`);

    try {
      const cachedCode = await this.cacheManager.get<string>(cacheKey);
      console.log(`🔍 캐시에서 조회된 코드: ${cachedCode}`);

      if (!cachedCode) {
        console.log(`❌ 캐시에 코드가 없음: ${cacheKey}`);
        return {
          success: false,
          message: '인증 코드가 만료되었거나 존재하지 않습니다.',
        };
      }
      if (cachedCode !== code) {
        console.log(`❌ 코드 불일치: 캐시(${cachedCode}) vs 입력(${code})`);
        return { success: false, message: '인증 코드가 일치하지 않습니다.' };
      }

      // 인증 성공 시 캐시에서 삭제
      await this.cacheManager.del(cacheKey);
      console.log(`✅ 인증 성공, 캐시 삭제: ${cacheKey}`);

      return { success: true, message: '인증이 완료되었습니다.' };
    } catch (error) {
      console.error(`❌ SMS 코드 검증 실패: ${error.message}`);
      return {
        success: false,
        message: '인증 코드 검증 중 오류가 발생했습니다.',
      };
    }
  }

  // 2. 회원가입 (E-mail, PassWord)
  async signup(signupDto: SignupReqDto) {
    const { email, password, name, nickname, phone } = signupDto;

    // 이메일 중복 체크
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new HttpException('이미 가입된 이메일입니다.', HttpStatus.CONFLICT);
    }

    // 닉네임 중복 체크
    const existingNickname = await this.userRepository.findOne({
      where: { nickname },
    });
    if (existingNickname) {
      throw new HttpException(
        '이미 사용 중인 닉네임입니다.',
        HttpStatus.CONFLICT,
      );
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    try {
      await validateOrReject(signupDto); // 유효성 검사

      // (1). DB에 User 저장
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

      // (2). DB에 UserProfile 저장
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
      const savedProfile = await queryRunner.manager.save(profile);
      console.log('savedProfile', savedProfile);

      // (3). DB에 UserSetting 저장
      const setting = queryRunner.manager.create(UserSetting, {
        user: savedUser,
        marketing_opt_in: signupDto.marketing_opt_in ?? false,
        no_push_alert: signupDto.no_push_alert ?? false,
      });
      const savedSetting = await queryRunner.manager.save(setting);
      console.log('savedSetting', savedSetting);

      const accessToken = this.generateAccessToken(savedUser.idx);
      const refreshToken = this.generateRefreshToken(savedUser.idx);

      // (4). DB에 refreshToken 저장
      const refreshEntity = queryRunner.manager.create(RefreshToken, {
        token: refreshToken,
        user: savedUser,
      });
      const savedRefreshToken = await queryRunner.manager.save(refreshEntity);
      console.log('savedRefreshToken', savedRefreshToken);

      await queryRunner.commitTransaction();

      // // 이메일 인증 메일 발송
      // try {
      //   await this.sendEmailVerification(savedUser);
      // } catch (emailError) {
      //   console.error(`이메일 인증 메일 발송 실패: ${emailError.message}`);
      // }
      return { accessToken, refreshToken, user: savedUser, profile };
      // catch문 에러 로그
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

  // 3. 로그인 (E-mail, PassWword)
  async login(loginDto: LoginReqDto) {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['refreshToken', 'profile'],
    });
    if (!user) {
      throw new HttpException(
        '존재하지 않는 사용자입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('차단된 사용자입니다.');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new HttpException(
        '비밀번호가 일치하지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const accessToken = this.generateAccessToken(user.idx);
    const refreshToken = this.generateRefreshToken(user.idx);
    await this.createRefreshTokenUsingUser(user.idx, refreshToken);

    return { result: 'ok', accessToken, refreshToken, user };
  }

  // 5,6,7,8. OAuth 소셜 로그인 처리 (카카오, 네이버, 구글, 애플)
  async oauthLogin(oauthUser: any): Promise<AuthTokenResDto> {
    // 0) provider 검증
    const rawProvider = oauthUser.provider as string;
    if (!Object.values(UserProvider).includes(rawProvider as UserProvider)) {
      throw new BadRequestException('지원하지 않는 로그인 제공자입니다.');
    }
    const provider = rawProvider as UserProvider;

    // 1) 이미 같은 소셜 계정이 있는지
    let user = await this.userRepository.findOne({
      where: { provider, provider_uid: oauthUser.providerId },
    });

    // 2) 이메일 충돌 방지: 같은 이메일의 다른 계정이 이미 있으면 정책대로
    const existingByEmail = oauthUser.email
      ? await this.userRepository.findOne({ where: { email: oauthUser.email } })
      : null;

    if (!user && existingByEmail) {
      throw new HttpException(
        '이미 해당 이메일로 가입된 계정이 있습니다. 이메일로 로그인한 뒤 소셜 계정을 연결해주세요.',
        HttpStatus.CONFLICT,
      );
      // existingByEmail.provider = provider;
      // existingByEmail.provider_uid = oauthUser.providerId;
      // user = await this.userRepository.save(existingByEmail);
    }

    // 3) 신규 생성 경로
    if (!user) {
      const nickname = await this.ensureUniqueNickname(
        oauthUser.nickname ||
          (oauthUser.email ? oauthUser.email.split('@')[0] : 'user'),
      );

      user = this.userRepository.create({
        email: oauthUser.email ?? null, // 이메일 동의 안 했을 수 있음
        nickname,
        name: oauthUser.name || nickname,
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
          const y = oauthUser.birthyear;
          const md = oauthUser.birthday; // MMDD
          birth_date = new Date(
            `${y}-${md.substring(0, 2)}-${md.substring(2, 4)}`,
          );
        }

        const profile = qr.manager.create(UserProfile, {
          user,
          profile_image_url: oauthUser.profile_image_url ?? null,
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

    // 4) 토큰 발급 + 저장
    const accessToken = this.generateAccessToken(user.idx);
    const refreshToken = this.generateRefreshToken(user.idx);
    await this.createRefreshTokenUsingUser(user.idx, refreshToken);

    return { accessToken, refreshToken };
  }

  // 닉네임 유니크 보정
  private async ensureUniqueNickname(base: string): Promise<string> {
    const cleaned = base.trim().replace(/\s+/g, '_');
    let candidate = cleaned || 'user';
    let tries = 0;
    while (
      await this.userRepository.findOne({ where: { nickname: candidate } })
    ) {
      tries += 1;
      candidate = `${cleaned}_${Math.floor(1000 + Math.random() * 9000)}`;
      if (tries > 5) break; // 과도 루프 방지
    }
    return candidate;
  }

  // 9. 토큰 갱신 - Refresh Token을 사용해 새로운 Access Token 발급
  async refreshTokens(refreshToken: string): Promise<AuthTokenResDto> {
    try {
      // 리프레시 토큰 검증
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // 토큰 타입 확인
      if (decoded.tokenType !== 'refresh') {
        throw new HttpException(
          '유효하지 않은 토큰 타입입니다.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // DB에서 리프레시 토큰 확인
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

      // 사용자 상태 확인
      if (refreshTokenEntity.user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('비활성화된 사용자입니다.');
      }

      // 새로운 토큰 발급
      const newAccessToken = this.generateAccessToken(
        refreshTokenEntity.user.idx,
      );
      const newRefreshToken = this.generateRefreshToken(
        refreshTokenEntity.user.idx,
      );

      // 리프레시 토큰 업데이트
      await this.createRefreshTokenUsingUser(
        refreshTokenEntity.user.idx,
        newRefreshToken,
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
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

  // 10. 로그아웃 - Refresh Token 삭제
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

  // ------------------------------ 공용 모듈 ------------------------------
  // *** 액세스 토큰 생성 ***
  generateAccessToken(user_idx: string) {
    const payload = { sub: user_idx, tokenType: 'access' };
    return this.jwtService.sign(payload); // JwtModule에서 secret, expiresIn 설정됨
  }

  // *** 리프레시 토큰 생성 ***
  generateRefreshToken(user_idx: string) {
    const payload = { sub: user_idx, tokenType: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '30d' }); // 기간만 명시
  }

  /***
   * 사용자 ID와 리프레시 토큰을 사용하여 RefreshToken 엔티티를 생성하거나 업데이트함.
   * 만약 사용자에 대한 RefreshToken 엔티티가 이미 존재하면 토큰 값을 업데이트하고,
   * 존재하지 않으면 새로운 RefreshToken 엔티티를 생성함.
   *
   * @param user_idx - 사용자 ID
   * @param refreshToken - 새로 생성된 리프레시 토큰
   */

  private async createRefreshTokenUsingUser(
    user_idx: string,
    refreshToken: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 기존 리프레시 토큰 존재 여부 조회
      let refreshTokenEntity = await queryRunner.manager.findOne(
        this.refreshTokenRepository.target,
        {
          where: { user: { idx: user_idx } },
        },
      );
      // 이미 존재할 경우 → 토큰 갱신
      if (refreshTokenEntity) {
        refreshTokenEntity.token = refreshToken;
        // 존재하지 않을 경우 → 새 엔티티 생성
      } else {
        refreshTokenEntity = this.refreshTokenRepository.create({
          user: { idx: user_idx },
          token: refreshToken,
        });
      }
      await queryRunner.manager.save(refreshTokenEntity);
      await queryRunner.commitTransaction();
    } catch (error) {
      console.error(`error: ${error}`);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `리프레시 토큰 저장 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // *** 이메일 인증 토큰 생성 및 메일 전송 ***
  async sendEmailVerification(user: User): Promise<void> {
    const token = uuidv4();
    await this.cacheManager.set(`email_verification:${token}`, user.idx, 3600); // 1시간 유효
    const verifyUrl = `${this.configService.get('FRONTEND_ORIGIN')}/auth/verify-email?token=${token}`;
    await this.mailerService.sendMail({
      to: user.email,
      from: this.configService.get('MAIL_FROM'),
      subject: '이메일 인증 요청',
      html: `<p>다음 링크를 클릭하여 이메일 인증을 완료하세요:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
    });
  }

  // *** 인증 토큰 검증 및 상태 업데이트 ***
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
