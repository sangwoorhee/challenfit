import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsDateString, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

// 일대일 채팅방 목록 조회
export class GetPrivateChatRoomsDto {
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
    description: '페이지당 채팅방 수', 
    default: 20,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

// 일대일 채팅 메시지 조회
export class GetPrivateMessagesDto {
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
  limit?: number = 50;

  @ApiProperty({ 
    description: '특정 시간 이전의 메시지만 조회 (ISO 8601 형식)', 
    required: false,
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  beforeTimestamp?: string;
}

// 일대일 채팅방 생성
export class CreatePrivateChatRoomDto {
  @ApiProperty({ 
    description: '상대방 사용자 IDX', 
    format: 'uuid' 
  })
  @IsUUID()
  targetUserIdx: string;
}

// 메시지 전송
export class SendPrivateMessageDto {
  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: '메시지 타입', 
    default: 'text',
    required: false 
  })
  @IsOptional()
  @IsString()
  messageType?: string = 'text';

  @ApiProperty({ 
    description: '첨부 파일 URL', 
    required: false 
  })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
