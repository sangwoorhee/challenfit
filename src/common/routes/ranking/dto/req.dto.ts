import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min, Max } from 'class-validator';

export class GetRankingReqDto {
  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number = 1;

  @ApiProperty({
    description: '페이지당 조회할 사용자 수',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: '페이지 크기는 최소 1 이상이어야 합니다.' })
//   @Max(100, { message: '페이지 크기는 최대 100 이하여야 합니다.' })
  size?: number = 20;
}
