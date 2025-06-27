import { Injectable, Inject, HttpException, HttpStatus, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserSetting) private readonly settingRepository: Repository<UserSetting>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  // 1. 휴대폰 SMS 인증 코드 전송
    async sendVerificationCode(phone: string): Promise<{ phone: string; code: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 숫자 코드
      
    const ttlSeconds = 300; // 5분 동안 유효
    await this.cacheManager.set(`sms:${phone}`, code, ttlSeconds);

    return {
      phone,
      code,
    };
  }

  // 2. 회원가입 (E-mail, PassWord)
  async signup(signupDto: SignupReqDto): Promise<AuthTokenResDto> {
    const { email, password, name, nickname, phone } = signupDto;

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new HttpException('이미 가입된 이메일입니다.', HttpStatus.CONFLICT);
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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
        const savedUser = await queryRunner.manager.save(user);
        console.log('savedUser', savedUser)

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
        console.log('savedProfile', savedProfile)

        // (3). DB에 UserSetting 저장
        const setting = queryRunner.manager.create(UserSetting, {
          user: savedUser,
          marketing_opt_in: signupDto.marketing_opt_in ?? false,
          no_push_alert: signupDto.no_push_alert ?? false,
        });
        const savedSetting = await queryRunner.manager.save(setting);
        console.log('savedSetting', savedSetting)

        const accessToken = this.generateAccessToken(savedUser.idx);
        const refreshToken = this.generateRefreshToken(savedUser.idx);

        // (4). DB에 refreshToken 저장
        const refreshEntity = queryRunner.manager.create(RefreshToken, {
          token: refreshToken,
          user: savedUser,
        });
        const savedRefreshToken = await queryRunner.manager.save(refreshEntity);
        console.log('savedRefreshToken', savedRefreshToken)

        await queryRunner.commitTransaction();

         // 이메일 인증 메일 발송
        await this.sendEmailVerification(savedUser);
        return { accessToken, refreshToken };
        // catch문 에러 로그
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`회원가입 중 오류 발생: ${error.message}`);
      throw new HttpException(`회원가입 중 오류 발생: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 로그인 (E-mail, PassWword)
  async login(loginDto: LoginReqDto): Promise<AuthTokenResDto> {
    const { email, password } = loginDto;
  
    const user = await this.userRepository.findOne({ where: { email }, relations: ['refreshToken'] });
    if (!user) {
      throw new HttpException('존재하지 않는 사용자입니다.', HttpStatus.NOT_FOUND);
    }

    if (user.status === UserStatus.BANNED) {
    throw new ForbiddenException('차단된 사용자입니다.');
    }
  
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new HttpException('비밀번호가 일치하지 않습니다.', HttpStatus.UNAUTHORIZED);
    }
  
    const accessToken = this.generateAccessToken(user.idx);
    const refreshToken = this.generateRefreshToken(user.idx);
    await this.createRefreshTokenUsingUser(user.idx, refreshToken);
  
    return { accessToken, refreshToken };
  }

  // 4. OAuth 소셜 로그인 처리 (카카오, 네이버, 구글, 애플)
  async oauthLogin(oauthUser: any): Promise<AuthTokenResDto> {
    
    // provider 값 검증 및 enum 캐스팅
    const rawProvider = oauthUser.provider as string;
    if (!Object.values(UserProvider).includes(rawProvider as UserProvider)) {
      throw new BadRequestException('지원하지 않는 로그인 제공자입니다.');
    }
    const provider = rawProvider as UserProvider;

    let user = await this.userRepository.findOne({
      where: { provider: oauthUser.provider, provider_uid: oauthUser.providerId },
    });

    // 소셜 로그인 유저가 존재하는지 확인
    if (user) {
    // 이미 가입된 소셜 유저가 차단 상태인지 확인
    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('차단된 사용자입니다.');
      }
    } else {
      // 신규 소셜 가입 유저 생성
      user = this.userRepository.create({
        email: oauthUser.email,
        name: oauthUser.name,
        provider: provider,
        provider_uid: oauthUser.providerId,
        status: UserStatus.ACTIVE,
      });
      await this.userRepository.save(user);

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const profile = queryRunner.manager.create(UserProfile, { user });
        await queryRunner.manager.save(profile);

        const setting = queryRunner.manager.create(UserSetting, { user });
        await queryRunner.manager.save(setting);

        await queryRunner.commitTransaction();
      } catch (error) {
        console.error(`OAuth 사용자 초기화 중 오류 발생: ${error.message}`);
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException(`OAuth 사용자 초기화 실패: ${error.message}`);
      } finally {
        await queryRunner.release();
      }
    }

    const accessToken = this.generateAccessToken(user.idx);
    const refreshToken = this.generateRefreshToken(user.idx);
    await this.createRefreshTokenUsingUser(user.idx, refreshToken);

    return { accessToken, refreshToken };
  }

  // ------------------------------ 공용 모듈 ------------------------------
  // *** 액세스 토큰 생성 *** 
  private generateAccessToken(user_idx: string) {
    const payload = { sub: user_idx, tokenType: 'access' };
    return this.jwtService.sign(payload); // JwtModule에서 secret, expiresIn 설정됨
  }
    
  
  // *** 리프레시 토큰 생성 *** 
  private generateRefreshToken(user_idx: string) {
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
      let refreshTokenEntity = await queryRunner.manager.findOne(this.refreshTokenRepository.target, {
        where: { user: { idx: user_idx } },
      });
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
      console.error(`error: ${error}`)
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`리프레시 토큰 저장 실패: ${error.message}`);
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
    const userIdx = await this.cacheManager.get<string>(`email_verification:${token}`);
    if (!userIdx) throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);
    await this.cacheManager.del(`email_verification:${token}`);
  }
}