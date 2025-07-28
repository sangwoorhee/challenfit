
import { ApiProperty } from '@nestjs/swagger';
import { UserProvider, UserStatus } from 'src/common/enum/enum';

export class CommonResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '응답 메시지' })
  message: string;
}

// 마이프로필 조회 응답 DTO
export class ProfileResDto {
  @ApiProperty({ description: '결과' })
  result: string;
  
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

export class UserProfileWithFollowResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '유저 정보' })
  user: any;

  @ApiProperty({ description: '프로필 정보' })
  profile: any;

  @ApiProperty({ description: '현재 사용자의 팔로잉 여부' })
  is_following: boolean;
}