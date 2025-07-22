import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsOptional } from 'class-validator';

// 좋아요 응답 DTO
export class LikeResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '좋아요 ID', format: 'uuid' })
  @IsString()
  idx: string;

  @ApiProperty({ description: '생성일시' })
  @IsDate()
  created_at: Date;

  @ApiProperty({ description: '좋아요를 누른 사용자 ID', format: 'uuid' })
  @IsString()
  user_idx: string;

  @ApiProperty({ description: '운동 인증 ID', format: 'uuid', required: false  })
  @IsString()
  @IsOptional()
  workout_cert_idx?: string;

  @ApiProperty({ description: '댓글 ID', format: 'uuid', required: false })
  @IsString()
  @IsOptional()
  comment_idx?: string;
}

// 좋아요 수 응답 DTO
export class LikeCountResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '좋아요 수' })
  @IsNumber()
  count: number;
}