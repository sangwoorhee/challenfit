import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

// 페이지네이션 (전역모듈) 요청 DTO
export class PageReqDto {
  @ApiPropertyOptional({ description: '페이지 번호(1 이상). 기본값=1' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 데이터 개수(1~50). 기본=15 등 원하는 값',
  })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  size: number = 10;
}
