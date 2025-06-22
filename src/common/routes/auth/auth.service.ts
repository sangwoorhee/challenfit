import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(User) private readonly userRepoRepository: Repository<User>,
    @InjectRepository(UserProfile) private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(UserSetting) private readonly settingRepository: Repository<UserSetting>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
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

  // 2. 회원가입
  async signup(signupDto: SignupReqDto): Promise<AuthTokenResDto> {
    const { email, password, name, nickname, phone } = signupDto;

    const existing = await this.userRepoRepository.findOne({ where: { email } });
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
          user_idx: savedUser.idx,
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
          user_idx: savedUser.idx,
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
          user_idx: savedUser.idx,
        });
        const savedRefreshToken = await queryRunner.manager.save(refreshEntity);
        console.log('savedRefreshToken', savedRefreshToken)

        await queryRunner.commitTransaction();
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
  
    const user = await this.userRepoRepository.findOne({ where: { email }, relations: ['refreshToken'] });
    if (!user) {
      throw new HttpException('존재하지 않는 사용자입니다.', HttpStatus.NOT_FOUND);
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

  // 매서드 정리
  // *** 액세스 토큰 생성
  private generateAccessToken(user_idx: number) {
    const payload = { sub: user_idx, tokenType: 'access' };
    return this.jwtService.sign(payload); // JwtModule에서 secret, expiresIn 설정됨
  }
    
  
  // *** 리프레시 토큰 생성
  private generateRefreshToken(user_idx: number) {
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
      user_idx: number,
      refreshToken: string,
    ) {
      // 기존 리프레시 토큰 존재 여부 조회
      let refreshTokenEntity = await this.refreshTokenRepository.findOneBy({
        user: { idx: user_idx },
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
      await this.refreshTokenRepository.save(refreshTokenEntity);
    }
}
