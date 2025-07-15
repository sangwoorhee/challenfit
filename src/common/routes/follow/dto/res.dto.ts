
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Response DTOs
export class FollowResDto {
    @ApiProperty({ description: '응답 메시지' })
    message: string;
  }
  
  export class UserFollowInfoDto {
    @ApiProperty({ description: '유저 ID' })
    idx: string;
  
    @ApiProperty({ description: '닉네임' })
    nickname: string;
  
    @ApiProperty({ description: '이름' })
    name: string;
  
    @ApiProperty({ description: '프로필 이미지 URL', required: false })
    profile_image_url?: string;
  
    @ApiProperty({ description: '한줄 소개', required: false })
    bio?: string;
  
    @ApiProperty({ description: '팔로우 여부' })
    is_following: boolean;
  }
  
  export class FollowListResDto {
    @ApiProperty({ description: '유저 목록', type: [UserFollowInfoDto] })
    users: UserFollowInfoDto[];
  
    @ApiProperty({ description: '전체 수' })
    total: number;
  }
  
  export class ProfileWithFollowDto {
    @ApiProperty({ description: '유저 정보' })
    user: {
      idx: string;
      email: string;
      phone: string;
      name: string;
      nickname: string;
      provider: string;
      status: string;
      challenge_mode: boolean;
      created_at: Date;
      updated_at: Date;
      last_login?: Date;
      following_count: number;
      follower_count: number;
    };
  
    @ApiProperty({ description: '프로필 정보' })
    profile: any;
  
    @ApiProperty({ description: '팔로우 여부' })
    is_following: boolean;
  }