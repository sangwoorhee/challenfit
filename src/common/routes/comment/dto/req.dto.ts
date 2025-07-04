import { IsString } from "class-validator";

// 댓글 생성 요청 DTO
export class CreateCommentReqDto {
  @IsString()
  workout_cert_idx: string;

  @IsString()
  content: string;
}

// 댓글 수정 요청 DTO
export class UpdateCommentReqDto {
  @IsString()
  content: string;
}