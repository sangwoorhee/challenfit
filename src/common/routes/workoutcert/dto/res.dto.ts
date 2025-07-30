import { ApiProperty } from '@nestjs/swagger';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';

export class WorkoutCertWithStatsDto extends WorkoutCert {
  @ApiProperty({ description: '좋아요 수' })
  like_count: number;

  @ApiProperty({ description: '댓글 수' })
  comment_count: number;

  @ApiProperty({ description: '현재 유저의 좋아요 여부' })
  is_liked: boolean;

  @ApiProperty({ description: '댓글 작성 여부', required: false })
  is_commented?: boolean;

  @ApiProperty({ description: '현재 유저가 같은 도전방 참여자인지 여부', required: false })
  is_same_challenge_participant?: boolean;
}

// 유저 통계 정보 DTO
export class UserStatsDto {
  @ApiProperty({ description: '운동인증 게시글 수' })
  workout_cert_count: number;

  @ApiProperty({ description: '팔로워 수' })
  follower_count: number;

  @ApiProperty({ description: '팔로잉 수' })
  following_count: number;

  @ApiProperty({
    description: '내가 이 유저를 팔로우 중인지 여부',
    required: false,
  })
  is_following?: boolean;
}

// 유저 통계 정보를 포함한 페이지네이션 응답 DTO
export class PageWithUserStatsResDto<T> {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지 크기' })
  size: number;

  @ApiProperty({ description: '전체 아이템 수' })
  totalCount: number;

  @ApiProperty({ description: '아이템 목록' })
  items: T[];

  @ApiProperty({ description: '유저 통계 정보', type: UserStatsDto })
  userStats: UserStatsDto;
}

// 운동 인증 생성/수정 응답 DTO
export class WorkoutCertResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '운동 인증 정보' })
  workoutCert: WorkoutCert;

  @ApiProperty({ description: '선택된 도전 참가자 idx', required: false })
  selected_challenge_participant_idx?: string;
}

// 단일 운동 인증글 조회용 DTO 추가
export class WorkoutCertDetailDto {
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @ApiProperty({ description: '이미지 URL' })
  image_url: string;

  @ApiProperty({ description: '캡션' })
  caption: string;

  @ApiProperty({ description: '쉬는날인지 여부' })
  is_rest: boolean;

  @ApiProperty({ description: '목표 승인 수' })
  target_approval_count: number;

  @ApiProperty({ description: '인증 완료 여부' })
  is_completed: boolean;

  @ApiProperty({ description: '생성 시간' })
  created_at: Date;

  @ApiProperty({ description: '좋아요 수' })
  like_count: number;

  @ApiProperty({ description: '댓글 수' })
  comment_count: number;

  @ApiProperty({ description: '현재 유저의 좋아요 여부' })
  is_liked: boolean;

  @ApiProperty({ description: '댓글 작성 여부', required: false })
  is_commented?: boolean;

  @ApiProperty({ description: '사용자 정보' })
  user: {
    idx: string;
    nickname: string;
    name: string;
    profile?: {
      profile_image_url?: string;
    };
  };

  @ApiProperty({ description: '도전 참가자 정보' })
  challenge_participant: ChallengeParticipant;
}