import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// 도전방 채팅 메시지 조회
export class GetMessagesDto {
  @ApiProperty({ 
    description: '페이지 번호', 
    default: 1,
    required: false 
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ 
    description: '페이지당 메시지 수', 
    default: 50,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ 
    description: '특정 시간 이전의 메시지만 조회 (ISO 8601 형식)', 
    required: false,
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  beforeTimestamp?: string;

  @ApiProperty({ 
    description: '시작 날짜 (메시지 내보내기용)', 
    required: false,
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ 
    description: '종료 날짜 (메시지 내보내기용)', 
    required: false,
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}