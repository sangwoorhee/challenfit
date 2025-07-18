import { ApiProperty } from '@nestjs/swagger';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';

export class WorkoutCertWithStatsDto extends WorkoutCert {
  @ApiProperty({ description: '좋아요 수' })
  like_count: number;

  @ApiProperty({ description: '댓글 수' })
  comment_count: number;

  @ApiProperty({ description: '현재 유저의 좋아요 여부' })
  is_liked: boolean;
}