import { ApiProperty } from '@nestjs/swagger';

export class UserRankingDto {
  @ApiProperty({ description: '랭킹 순위', example: 1 })
  rank: number;

  @ApiProperty({ description: '사용자 ID', format: 'uuid' })
  user_idx: string;

  @ApiProperty({ description: '이메일' })
  email: string;

  @ApiProperty({ description: '휴대폰 번호' })
  phone: string;

  @ApiProperty({ description: '이름' })
  name: string;

  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @ApiProperty({ description: '가입 경로' })
  provider: string;

  @ApiProperty({ description: '소셜 UID', required: false })
  provider_uid?: string;

  @ApiProperty({ description: '상태' })
  status: string;

  @ApiProperty({ description: '챌린지 모드 여부' })
  challenge_mode: boolean;

  @ApiProperty({ description: '계정 생성일' })
  created_at: Date;

  @ApiProperty({ description: '계정 수정일' })
  updated_at: Date;

  @ApiProperty({ description: '마지막 로그인 시각', required: false })
  last_login?: Date;

  @ApiProperty({ description: '팔로잉 수' })
  following_count: number;

  @ApiProperty({ description: '팔로워 수' })
  follower_count: number;

  // UserProfile 정보
  @ApiProperty({ description: '프로필 ID', format: 'uuid', required: false })
  profile_idx?: string;

  @ApiProperty({ description: '생년월일', required: false })
  birth_date?: Date;

  @ApiProperty({ description: '키', required: false })
  height?: number;

  @ApiProperty({ description: '몸무게', required: false })
  weight?: number;

  @ApiProperty({ description: '관심 운동', required: false })
  interest_exercises?: string;

  @ApiProperty({ description: '운동 목적', required: false })
  exercise_purpose?: string;

  @ApiProperty({ description: '자기소개', required: false })
  introduction?: string;

  @ApiProperty({ description: '프로필 이미지 URL', required: false })
  profile_image_url?: string;

  @ApiProperty({ description: '공개 프로필 여부' })
  is_public: boolean;

  @ApiProperty({ description: '포인트' })
  points: number;
}

export class GetRankingResDto {
  @ApiProperty({ description: '결과 상태' })
  result: string;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지 크기' })
  size: number;

  @ApiProperty({ description: '전체 사용자 수' })
  totalCount: number;

  @ApiProperty({ description: '전체 페이지 수' })
  totalPages: number;

  @ApiProperty({ 
    description: '사용자 랭킹 목록',
    type: [UserRankingDto]
  })
  rankings: UserRankingDto[];
}
