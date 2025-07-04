import { IsOptional, IsString } from "class-validator";

// 좋아요 생성 요청 DTO
export class CreateLikeReqDto {
  @IsString()
  @IsOptional()
  workout_cert_idx?: string;

  @IsString()
  @IsOptional()
  comment_idx?: string;
}