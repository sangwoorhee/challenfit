import { ApiProperty } from '@nestjs/swagger';

// 페이지네이션 (전역모듈) 응답 DTO
export class PageResDto<T> {
  @ApiProperty({ description: '현재 페이지 번호' })
  page: number;

  @ApiProperty({ description: '페이지 당 개수' })
  size: number;

  @ApiProperty({ description: '전체 아이템 개수' })
  totalCount: number;

  @ApiProperty({ description: '아이템 배열' })
  items?: T[];

  @ApiProperty({ description: '메시지', required: false })
  message?: string;

  @ApiProperty({ description: '요약 데이터', required: false })
  summary?: any;

  @ApiProperty({ description: '설교 목록 (datas)' })
  datas?: T[];
}
