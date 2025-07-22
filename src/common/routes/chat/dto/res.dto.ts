// src/common/routes/chat/dto/chat-message-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MessageSenderDto {
  @ApiProperty({ description: '사용자 IDX', format: 'uuid' })
  idx: string;

  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  profileImageUrl?: string;
}

export class ChatMessageDto {
  @ApiProperty({ description: '메시지 IDX', format: 'uuid' })
  idx: string;

  @ApiProperty({ description: '메시지 내용' })
  message: string;

  @ApiProperty({ 
    description: '메시지 타입', 
    enum: ['text', 'image', 'file'],
    default: 'text' 
  })
  messageType: string;

  @ApiProperty({ description: '첨부 파일 URL', nullable: true })
  attachmentUrl?: string;

  @ApiProperty({ description: '삭제 여부', default: false })
  isDeleted: boolean;

  @ApiProperty({ description: '전송 시간' })
  createdAt: Date;

  @ApiProperty({ description: '발신자 정보', type: MessageSenderDto })
  sender: MessageSenderDto;
}

export class PaginationDto {
  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수' })
  limit: number;

  @ApiProperty({ description: '전체 항목 수' })
  total: number;

  @ApiProperty({ description: '전체 페이지 수' })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부' })
  hasMore: boolean;
}

export class GetMessagesResponseDto {
  @ApiProperty({ 
    description: '메시지 목록', 
    type: [ChatMessageDto] 
  })
  messages: ChatMessageDto[];

  @ApiProperty({ 
    description: '페이지네이션 정보', 
    type: PaginationDto 
  })
  pagination: PaginationDto;

  @ApiProperty({ description: '도전방 IDX', format: 'uuid' })
  challengeRoomIdx: string;
}