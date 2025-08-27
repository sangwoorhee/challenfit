import { ApiProperty } from '@nestjs/swagger';

export class PrivateChatUserDto {
  @ApiProperty({ description: '사용자 IDX', format: 'uuid' })
  idx: string;

  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  profileImageUrl?: string;
}

export class PrivateChatMessageDto {
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

  @ApiProperty({ description: '내 메시지 여부', default: false })
  isMine: boolean;

  @ApiProperty({ description: '읽음 여부', default: false })
  isRead: boolean;

  @ApiProperty({ description: '전송 시간' })
  createdAt: Date;

  @ApiProperty({ description: '발신자 정보', type: PrivateChatUserDto })
  sender: PrivateChatUserDto;
}

export class PrivateChatRoomDto {
  @ApiProperty({ description: '채팅방 IDX', format: 'uuid' })
  idx: string;

  @ApiProperty({ description: '상대방 정보', type: PrivateChatUserDto })
  participant: PrivateChatUserDto;

  @ApiProperty({ description: '마지막 메시지', nullable: true })
  lastMessage?: string;

  @ApiProperty({ description: '마지막 메시지 시간', nullable: true })
  lastMessageAt?: Date;

  @ApiProperty({ description: '읽지 않은 메시지 수', default: 0 })
  unreadCount: number;

  @ApiProperty({ description: '채팅방 생성 시간' })
  createdAt: Date;
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

export class GetPrivateChatRoomsResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ 
    description: '채팅방 목록', 
    type: [PrivateChatRoomDto] 
  })
  chatRooms: PrivateChatRoomDto[];

  @ApiProperty({ 
    description: '페이지네이션 정보', 
    type: PaginationDto 
  })
  pagination: PaginationDto;
}

export class GetPrivateMessagesResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ 
    description: '메시지 목록', 
    type: [PrivateChatMessageDto] 
  })
  messages: PrivateChatMessageDto[];

  @ApiProperty({ 
    description: '페이지네이션 정보', 
    type: PaginationDto 
  })
  pagination: PaginationDto;

  @ApiProperty({ description: '채팅방 IDX', format: 'uuid' })
  chatRoomIdx: string;
}

export class CreatePrivateChatRoomResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '채팅방 정보', type: PrivateChatRoomDto })
  chatRoom: PrivateChatRoomDto;

  @ApiProperty({ description: '새로 생성된 방인지 여부' })
  isNewRoom: boolean;
}
