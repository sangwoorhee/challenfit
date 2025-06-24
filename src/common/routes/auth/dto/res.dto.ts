import { ApiProperty } from '@nestjs/swagger';

// 회원가입 응답 DTO
export class AuthTokenResDto {
  @ApiProperty({ description: 'JWT 액세스토큰' })
  accessToken: string;

  @ApiProperty({ description: 'JWT 리프레시토큰' })
  refreshToken: string;
}
