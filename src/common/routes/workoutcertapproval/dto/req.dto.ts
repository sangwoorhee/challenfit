import { IsOptional, IsString, IsUUID } from 'class-validator';

// 운동 인증 승인 요청 DTO
export class CreateCertApprovalReqDto {
  @IsUUID()
  workout_cert_idx: string;

  @IsString()
  stamp_img: string;

  @IsString()
  nickname: string;
}
