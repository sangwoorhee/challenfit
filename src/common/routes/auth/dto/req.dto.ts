import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  IsInt,
  IsIn,
  IsUrl,
} from 'class-validator';

// 회원가입 요청 DTO
export class SignupReqDto {
  @ApiProperty({ description: '이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: '이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '닉네임' })
  @IsString()
  nickname: string;

  @ApiProperty({ description: '핸드폰' })
  @IsString()
  phone: string;

  @ApiProperty({ description: '생년월일' })
  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @ApiProperty({ description: '키' })
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiProperty({ description: '몸무게' })
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiProperty({ description: '관심 운동' })
  @IsOptional()
  @IsString()
  interest_exercises?: string;

  @ApiProperty({ description: '운동 목적' })
  @IsOptional()
  @IsString()
  exercise_purpose?: string;

  @ApiProperty({ description: '자기 소개' })
  @IsOptional()
  @IsString()
  introduction?: string;

  @ApiProperty({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profile_image_url?: string;

  @ApiProperty({ description: '마케팅 수신 동의' })
  @IsOptional()
  @IsBoolean()
  marketing_opt_in?: boolean;

  @ApiProperty({ description: '푸시 알림 거부' })
  @IsOptional()
  @IsBoolean()
  no_push_alert?: boolean;
}

export class SocialLoginReqDto {
  @IsIn(['kakao', 'naver', 'google', 'apple'])
  provider: 'kakao' | 'naver' | 'google' | 'apple';

  @IsString()
  socialId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  // 카카오 토큰 검증용(선택)
  @IsOptional()
  @IsString()
  kakaoAccessToken?: string;

  // 다른 프로바이더용(선택)
  @IsOptional()
  @IsString()
  idToken?: string;
}

// 로그인
export class LoginReqDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// 휴대폰 SMS 인증 코드 검증
export class VerifySmsCodeReqDto {
  phone: string;
  code: string;
}
