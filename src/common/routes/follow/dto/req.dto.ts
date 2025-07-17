
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Request DTOs
export class FollowUserReqDto {
  @ApiProperty({ description: '팔로우할 유저 ID' })
  @IsUUID()
  target_user_idx: string;
}

export class FollowRequestActionDto {
  @ApiProperty({ description: '팔로우 요청자 ID' })
  @IsUUID()
  requester_idx: string;
}