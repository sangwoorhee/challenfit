import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import {
  UpdateUserSettingReqDto,
  UpdateUserProfileReqDto,
  ChangePasswordReqDto,
} from './dto/req.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UserProfile } from '../../entities/user_profile.entity';
import { UserSetting } from '../../entities/user_setting.entity';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CommonResDto, UserProfileWithFollowResDto } from './dto/res.dto';
import { Follow } from 'src/common/entities/follow.entity';
import { ConfigService } from '@nestjs/config';
import { deleteS3File } from 'src/common/config/multer-s3-config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly settingRepository: Repository<UserSetting>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // 1. 회원 환경설정 수정
  async updateSetting(
    user_idx: string,
    dto: UpdateUserSettingReqDto,
  ): Promise<CommonResDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const setting = await this.settingRepository.findOne({
        where: { user: { idx: user_idx } },
      });
      if (!setting)
        throw new NotFoundException('설정 정보를 찾을 수 없습니다.');

      this.settingRepository.merge(setting, dto);
      await this.settingRepository.save(setting);

      await queryRunner.commitTransaction();
      return { result: 'ok', message: '환경설정이 수정되었습니다.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`);
      throw new InternalServerErrorException(
        `환경설정 수정 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 마이프로필 수정
  async updateProfile(
    user_idx: string,
    dto: UpdateUserProfileReqDto,
  ): Promise<CommonResDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({
        where: { idx: user_idx },
        relations: ['profile'],
      });

      if (!user || !user.profile) {
        throw new NotFoundException(
          '사용자 또는 프로필 정보를 찾을 수 없습니다.',
        );
      }

      // 기존 프로필 이미지 URL 저장 (삭제용)
      const oldProfileImageUrl = user.profile.profile_image_url;

      // 닉네임 중복 체크 및 업데이트
      if (dto.nickname !== undefined && dto.nickname !== user.nickname) {
        const existingUser = await this.userRepository.findOne({
          where: { nickname: dto.nickname },
        });

        if (existingUser) {
          throw new ConflictException('이미 사용 중인 닉네임입니다.');
        }

        user.nickname = dto.nickname;
        await this.userRepository.save(user);
      }

      // 프로필 관련 정보 업데이트
      const { nickname, ...profileFields } = dto;
      this.profileRepository.merge(user.profile, profileFields);
      await this.profileRepository.save(user.profile);

      // 새로운 프로필 이미지가 업로드되었고, 기존 이미지가 있다면 기존 이미지 삭제
      if (
        dto.profile_image_url && 
        oldProfileImageUrl && 
        oldProfileImageUrl !== dto.profile_image_url
      ) {
        // 트랜잭션 커밋 후 비동기적으로 기존 이미지 삭제
        setImmediate(async () => {
          try {
            const deleted = await deleteS3File(this.configService, oldProfileImageUrl);
            if (deleted) {
              console.log(`기존 프로필 이미지 삭제 완료: ${oldProfileImageUrl}`);
            } else {
              console.warn(`기존 프로필 이미지 삭제 실패: ${oldProfileImageUrl}`);
            }
          } catch (error) {
            console.error('기존 프로필 이미지 삭제 중 오류:', error);
          }
        });
      }

      await queryRunner.commitTransaction();
      return { result: 'ok', message: '프로필이 수정되었습니다.' };
    } catch (error) {
      console.error(`error: ${error}`);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `프로필 수정 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 비밀번호 변경
  async changePassword(
    user_idx: string,
    dto: ChangePasswordReqDto,
  ): Promise<CommonResDto> {
    const { currentPassword, newPassword, newPasswordConfirm } = dto;

    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestException(
        '새 비밀번호와 비밀번호 확인이 일치하지 않습니다.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({
        where: { idx: user_idx },
      });
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('기존 비밀번호가 일치하지 않습니다.');
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      console.log('[새 비밀번호 해시]', hashedPassword); // 확인용
      user.password = hashedPassword;

      await this.userRepository.save(user);
      await queryRunner.commitTransaction(); // ✅ 커밋 필수

      return { result: 'ok', message: '비밀번호가 성공적으로 변경되었습니다.' };
    } catch (error) {
      console.error(`[비밀번호 변경 에러]: ${error}`);
      await queryRunner.rollbackTransaction();

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `비밀번호 변경 실패: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // 4. 회원탈퇴
  async deleteAccount(user_idx: string): Promise<CommonResDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({
        where: { idx: user_idx },
      });
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

      await this.userRepository.remove(user);
      await queryRunner.commitTransaction();
      return { result: 'ok', message: '회원탈퇴가 완료되었습니다.' };
    } catch (error) {
      console.error(`error: ${error}`);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`회원탈퇴 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // 5,6. 다른 유저 및 나의 마이프로필 정보 조회
  async getUserProfile(user_idx: string, current_user_idx?: string) {
    const user = await this.userRepository.findOne({
      where: { idx: user_idx },
      relations: ['profile'],
      select: [
        'idx',
        'email',
        'phone',
        'name',
        'nickname',
        'provider',
        'status',
        'challenge_mode',
        'created_at',
        'updated_at',
        'last_login',
        'following_count',
        'follower_count',
      ],
    });
    
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
  
    let is_following = false;
    
    // 다른 유저의 프로필을 조회하는 경우 팔로우 여부 확인
    if (current_user_idx && current_user_idx !== user_idx) {
      const follow = await this.followRepository.findOne({
        where: {
          follower: { idx: current_user_idx },
          following: { idx: user_idx },
        },
      });
      is_following = !!follow;
    }
  
    // profile 정보와 함께 필요한 모든 정보 반환
    return {
      user: {
        idx: user.idx,
        email: user.email,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
        provider: user.provider,
        status: user.status,
        challenge_mode: user.challenge_mode,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        following_count: user.following_count || 0,
        follower_count: user.follower_count || 0,
      },
      profile: {
        height: user.profile?.height,
        weight: user.profile?.weight,
        interest_exercises: user.profile?.interest_exercises,
        exercise_purpose: user.profile?.exercise_purpose,
        introduction: user.profile?.introduction,
        profile_image_url: user.profile?.profile_image_url,
      },
      is_following,
    };
  }

  //  프로필 조회 시 팔로잉 여부 추가
  async getUserProfileWithFollowStatus(
    targetUserIdx: string,
    currentUserIdx?: string,
  ): Promise<UserProfileWithFollowResDto> {
    const user = await this.userRepository.findOne({
      where: { idx: targetUserIdx },
      relations: ['profile'],
    });
    
    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }
    
    let isFollowing = false;
    if (currentUserIdx && currentUserIdx !== targetUserIdx) {
      const follow = await this.followRepository.findOne({
        where: {
          follower: { idx: currentUserIdx },
          following: { idx: targetUserIdx },
        },
      });
      isFollowing = !!follow;
    }
    
    return {
      result: 'ok',
      user,
      profile: user.profile,
      is_following: isFollowing,
    };
  }
}
