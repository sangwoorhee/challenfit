
import { ApiProperty } from '@nestjs/swagger';
import { UserProvider, UserStatus } from 'src/common/enum/enum';

export class CommonResDto {
  @ApiProperty({ description: '응답 메시지' })
  message: string;
}

// 마이프로필 조회 응답 DTO
export class ProfileResDto {
  user: {
    idx: string;
    email: string;
    phone: string;
    name: string;
    nickname: string;
    provider: UserProvider;
    status: UserStatus;
    challenge_mode: boolean;
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
    following_count: number;
    follower_count: number;
  };
  profile: {
    height?: number;
    weight?: number;
    interest_exercises?: string;
    exercise_purpose?: string;
    introduction?: string;
    profile_image_url?: string;
  };
  is_following: boolean;
}