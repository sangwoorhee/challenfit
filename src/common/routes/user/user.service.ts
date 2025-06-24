import {
  Injectable, NotFoundException, BadRequestException, Inject,
  InternalServerErrorException
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
import { CommonResDto } from './dto/res.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserSetting) private settingRepository: Repository<UserSetting>,
    @InjectRepository(UserProfile) private profileRepository: Repository<UserProfile>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. 회원 환경설정 수정
  async updateSetting(user_idx: string, dto: UpdateUserSettingReqDto): Promise<CommonResDto> {
   
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
   
    try {
    const setting = await this.settingRepository.findOne({ where: { user: { idx: user_idx } } });
    if (!setting) throw new NotFoundException('설정 정보를 찾을 수 없습니다.');

    this.settingRepository.merge(setting, dto);
    await this.settingRepository.save(setting);

    return { message: '환경설정이 수정되었습니다.' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`)
      throw new InternalServerErrorException(`환경설정 수정 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 마이프로필 수정
  async updateProfile(user_idx: string, dto: UpdateUserProfileReqDto): Promise<CommonResDto> {
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
    const profile = await this.profileRepository.findOne({ where: { user: { idx: user_idx } } });
    if (!profile) throw new NotFoundException('프로필 정보를 찾을 수 없습니다.');

    this.profileRepository.merge(profile, dto);
    await this.profileRepository.save(profile);

    return { message: '프로필이 수정되었습니다.' };
    } catch (error) {
      console.error(`error: ${error}`)
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`프로필 수정 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 비밀번호 변경
async changePassword(user_idx: string, dto: ChangePasswordReqDto): Promise<CommonResDto> {
  
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  
  try {
  const user = await this.userRepository.findOne({ where: { idx: user_idx } });
  if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

  const isMatch = await bcrypt.compare(dto.currentPassword, user.password); 
  if (!isMatch) {
    throw new BadRequestException('기존 비밀번호가 일치하지 않습니다.');
  }

  const salt = await bcrypt.genSalt();
  user.password = await bcrypt.hash(dto.newPassword, salt);
  await this.userRepository.save(user);

  return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  } catch (error) {
    console.error(`error: ${error}`)
    await queryRunner.rollbackTransaction();
    throw new InternalServerErrorException(`비밀번호 변경 실패: ${error.message}`);
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
    const user = await this.userRepository.findOne({ where: { idx: user_idx } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    await this.userRepository.remove(user);
    return { message: '회원탈퇴가 완료되었습니다.' };
    } catch (error) {
      console.error(`error: ${error}`)
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`회원탈퇴 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}

