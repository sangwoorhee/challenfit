import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsString, IsBoolean, IsInt, IsOptional } from 'class-validator';

// 인증글 생성 요청 DTO
export class CreateWorkoutCertReqDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '업로드할 이미지 파일',
  })
  image: any; // Swagger 문서화용

  @IsString()
  caption: string;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  //@Type(() => Boolean) 상우씨  이건  'false'. 같이 문자열을 truthy한 값이니까  true로  바꿔 버리는 기능이에요
  is_rest: boolean;
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
  @Type(() => Boolean)
  is_rest?: boolean;
}
