import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsInt, IsOptional } from 'class-validator';

// 인증글 생성 요청 DTO
export class CreateWorkoutCertReqDto {
  @IsString()
  challenge_room_idx: string;

  @ApiProperty({ type: 'string', format: 'binary', description: '업로드할 이미지 파일' })
  image: any; // Swagger 문서화용

  @IsString()
  caption: string;

  @IsBoolean()
  is_rest: boolean;

  @IsInt()
  target_approval_count: number;
}

// 인증글 수정 요청 DTO
export class UpdateWorkoutCertReqDto {
  // @IsOptional()
  // @IsString()
  // image_url?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsBoolean()
  is_rest?: boolean;
}