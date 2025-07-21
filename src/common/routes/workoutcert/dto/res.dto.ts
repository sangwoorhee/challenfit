import { ApiProperty } from '@nestjs/swagger';
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
}

// 유저 통계 정보 DTO
export class UserStatsDto {
  @ApiProperty({ description: '운동인증 게시글 수' })
  workout_cert_count: number;

  @ApiProperty({ description: '팔로워 수' })
  follower_count: number;

  @ApiProperty({ description: '팔로잉 수' })
  following_count: number;
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