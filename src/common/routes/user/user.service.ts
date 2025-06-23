import {
  Injectable, NotFoundException, BadRequestException, Inject
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
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CommonResDto } from './dto/res.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserSetting) private settingRepository: Repository<UserSetting>,
    @InjectRepository(UserProfile) private profileRepository: Repository<UserProfile>,
  ) {}

  // 1. 회원 환경설정 수정
  async updateSetting(userId: number, dto: UpdateUserSettingReqDto): Promise<CommonResDto> {
    const setting = await this.settingRepository.findOne({ where: { user: { idx: userId } } });
    if (!setting) throw new NotFoundException('설정 정보를 찾을 수 없습니다.');

    this.settingRepository.merge(setting, dto);
    await this.settingRepository.save(setting);

    return { message: '환경설정이 수정되었습니다.' };
  }

  // 2. 마이프로필 수정
  async updateProfile(userId: number, dto: UpdateUserProfileReqDto): Promise<CommonResDto> {
    const profile = await this.profileRepository.findOne({ where: { user: { idx: userId } } });
    if (!profile) throw new NotFoundException('프로필 정보를 찾을 수 없습니다.');

    this.profileRepository.merge(profile, dto);
    await this.profileRepository.save(profile);

    return { message: '프로필이 수정되었습니다.' };
  }

  // 3. 비밀번호 변경
async changePassword(userId: number, dto: ChangePasswordReqDto): Promise<CommonResDto> {
  const user = await this.userRepository.findOne({ where: { idx: userId } });
  if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

  const isMatch = await bcrypt.compare(dto.currentPassword, user.password); // ✅ 평문 vs 해시 비교
  if (!isMatch) {
    throw new BadRequestException('기존 비밀번호가 일치하지 않습니다.');
  }

  const salt = await bcrypt.genSalt();
  user.password = await bcrypt.hash(dto.newPassword, salt); // ✅ 새 비밀번호 해시 저장
  await this.userRepository.save(user);

  return { message: '비밀번호가 성공적으로 변경되었습니다.' };
}

// 4. 회원탈퇴
  async deleteAccount(userId: number): Promise<CommonResDto> {
    const user = await this.userRepository.findOne({ where: { idx: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    await this.userRepository.remove(user);
    return { message: '회원탈퇴가 완료되었습니다.' };
  }
}
