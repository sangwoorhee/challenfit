
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

// 사용자 환경설정 업데이트 요청 DTO
export class UpdateUserSettingReqDto {
  @ApiProperty({ description: '마케팅 수신 동의 여부' })
  @IsBoolean()
  marketing_opt_in: boolean;

  @ApiProperty({ description: '푸시 알림 수신 거부 여부' })
  @IsBoolean()
  no_push_alert: boolean;
}

// 사용자 프로필 업데이트 요청 DTO
export class UpdateUserProfileReqDto {
  @ApiProperty({ description: '키(cm)' })
  @IsOptional()
  height?: number;

  @ApiProperty({ description: '몸무게(kg)' })
  @IsOptional()
  weight?: number;

  @ApiProperty({ description: '운동 관심사' })
  @IsOptional()
  interest_exercises?: string;

  @ApiProperty({ description: '운동 목적' })
  @IsOptional()
  exercise_purpose?: string;

  @ApiProperty({ description: '한줄 소개' })
  @IsOptional()
  introduction?: string;

  @ApiProperty({ description: '프로필 이미지 URL' })
  @IsOptional()
  profile_image_url?: string;
}

// 비밀번호 변경 요청 DTO
export class ChangePasswordReqDto {
  @ApiProperty({ description: '기존 비밀번호' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: '새 비밀번호' })
  @IsString()
  newPassword: string;

  @ApiProperty({ description: '새 비밀번호 확인' })
  @IsString()
  newPasswordConfirm: string;
}
