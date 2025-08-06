import { ApiProperty } from '@nestjs/swagger';

// 참가자 정보 DTO
export class ParticipantInfoDto {
  @ApiProperty({ description: '사용자 IDX', format: 'uuid' })
  userIdx: string;

  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @ApiProperty({ description: '프로필 이미지 URL', nullable: true })
  profileImageUrl?: string;

  @ApiProperty({ description: '참여 시각' })
  joinedAt: Date;

  @ApiProperty({ 
    description: '참가자 상태', 
    enum: ['PENDING', 'ONGOING', 'COMPLETED']
  })
  status: string;

  @ApiProperty({ description: '온라인 상태', required: false })
  isOnline?: boolean;

  @ApiProperty({ description: '마지막 접속 시간', required: false })
  lastSeen?: Date;
}

// 참가자 목록 응답 DTO
export class ParticipantsListResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ 
    description: '참가자 목록', 
    type: [ParticipantInfoDto] 
  })
  participants: ParticipantInfoDto[];

  @ApiProperty({ description: '전체 참가자 수' })
  totalCount: number;

  @ApiProperty({ description: '도전방 IDX', format: 'uuid' })
  challengeRoomIdx: string;

  @ApiProperty({ description: '온라인 참가자 수', required: false })
  onlineCount?: number;
}

// 참여 성공 응답 DTO
export class ParticipateSuccessResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '메시지' })
  message: string;

  @ApiProperty({ 
    description: '참가자 정보', 
    type: ParticipantInfoDto 
  })
  participant: ParticipantInfoDto;

  @ApiProperty({ description: '현재 참가자 수' })
  currentParticipants: number;

  @ApiProperty({ description: '최대 참가자 수' })
  maxParticipants: number;
}

// 참여 취소 응답 DTO
export class CancelParticipationResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '메시지' })
  message: string;

  @ApiProperty({ description: '취소 시각' })
  canceledAt: Date;
}

// 도전방 정보 DTO
export class ChallengeRoomInfoDto {
  @ApiProperty({ description: '도전방 IDX', format: 'uuid' })
  idx: string;

  @ApiProperty({ description: '도전방 제목' })
  title: string;

  @ApiProperty({ description: '도전 목표' })
  goal: string;

  @ApiProperty({ 
    description: '도전방 상태', 
    enum: ['대기중', '진행중', '종료']
  })
  status: string;

  @ApiProperty({ description: '최대 참가 인원' })
  maxParticipants: number;

  @ApiProperty({ description: '현재 참가 인원' })
  currentParticipants: number;

  @ApiProperty({ description: '공개 여부' })
  isPublic: boolean;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '시작일', nullable: true })
  startDate?: Date;

  @ApiProperty({ description: '종료일', nullable: true })
  endDate?: Date;
}

// 도전방 정보 응답 DTO
export class RoomInfoResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ 
    description: '도전방 정보', 
    type: ChallengeRoomInfoDto 
  })
  room: ChallengeRoomInfoDto;

  @ApiProperty({ description: '현재 사용자 참여 여부' })
  isParticipant: boolean;

  @ApiProperty({ description: '참여 가능 여부' })
  canJoin: boolean;
}

// 소켓 이벤트 응답 DTO들
export class ParticipantJoinedEventDto {
  @ApiProperty({ 
    description: '참가자 목록', 
    type: [ParticipantInfoDto] 
  })
  participants: ParticipantInfoDto[];

  @ApiProperty({ description: '전체 참가자 수' })
  totalCount: number;

  @ApiProperty({ description: '도전방 IDX', format: 'uuid' })
  challengeRoomIdx: string;

  @ApiProperty({ 
    description: '새로 참여한 참가자', 
    type: ParticipantInfoDto 
  })
  newParticipant: ParticipantInfoDto;
}

// 참가자 나감 이벤트 DTO
export class ParticipantLeftEventDto {
  @ApiProperty({ 
    description: '참가자 목록', 
    type: [ParticipantInfoDto] 
  })
  participants: ParticipantInfoDto[];

  @ApiProperty({ description: '전체 참가자 수' })
  totalCount: number;

  @ApiProperty({ description: '도전방 IDX', format: 'uuid' })
  challengeRoomIdx: string;

  @ApiProperty({ description: '나간 참가자 정보' })
  removedParticipant: {
    userIdx: string;
    nickname: string;
  };
}

// 에러 응답 DTO
export class EntryErrorResponseDto {
  @ApiProperty({ description: '에러 코드' })
  code: string;

  @ApiProperty({ description: '에러 메시지' })
  message: string;

  @ApiProperty({ description: '에러 발생 시각' })
  timestamp: Date;

  @ApiProperty({ description: '추가 정보', required: false })
  details?: any;
}

// 사용자 입장/퇴장 이벤트 DTO
export class UserRoomEventDto {
  @ApiProperty({ description: '사용자 IDX', format: 'uuid' })
  userIdx: string;

  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @ApiProperty({ description: '이벤트 시각' })
  timestamp: Date;

  @ApiProperty({ description: '이벤트 타입', enum: ['joined', 'left'] })
  eventType: 'joined' | 'left';
}

// 테스트 연결 응답 DTO
export class TestConnectionResponseDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '메시지' })
  message: string;

  @ApiProperty({ description: '소켓 URL' })
  socketUrl: string;

  @ApiProperty({ description: '현재 시각' })
  timestamp: Date;

  @ApiProperty({ description: '서비스 설명' })
  description: string;
}