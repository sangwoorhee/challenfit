import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

// 도전방 입장 DTO (소켓)
export class JoinRoomDto {
  @ApiProperty({ 
    description: '도전방 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  challengeRoomIdx: string;

  @ApiProperty({ 
    description: '사용자 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  userIdx: string;
}

// 도전 참여 DTO (소켓)
export class ParticipateDto {
  @ApiProperty({ 
    description: '도전방 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  challengeRoomIdx: string;

  @ApiProperty({ 
    description: '사용자 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  userIdx: string;

  @ApiProperty({ 
    description: '사용자 닉네임 (선택)', 
    required: false,
    example: '운동왕'
  })
  @IsOptional()
  @IsString()
  nickname?: string;
}

// 도전 참여 취소 DTO (소켓)
export class CancelParticipationDto {
  @ApiProperty({ 
    description: '도전방 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  challengeRoomIdx: string;

  @ApiProperty({ 
    description: '사용자 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  userIdx: string;
}

// 참가자 목록 조회 DTO (소켓)
export class GetParticipantsDto {
  @ApiProperty({ 
    description: '도전방 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  challengeRoomIdx: string;

  @ApiProperty({ 
    description: '온라인 사용자만 조회', 
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  onlineOnly?: boolean;
}

// 도전방 나가기 DTO (소켓)
export class LeaveRoomDto {
  @ApiProperty({ 
    description: '도전방 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  challengeRoomIdx: string;

  @ApiProperty({ 
    description: '사용자 IDX', 
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  userIdx: string;
}

// REST API용 DTO들

// 도전 참여 요청 DTO (REST API)
export class CreateParticipantDto {
  @ApiProperty({ 
    description: '참여 메시지 (선택)', 
    required: false,
    example: '열심히 하겠습니다!'
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ 
    description: '알림 수신 여부', 
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  enableNotification?: boolean;
}

// 참가자 상태 업데이트 DTO
export class UpdateParticipantStatusDto {
  @ApiProperty({ 
    description: '참가자 상태', 
    enum: ['PENDING', 'ONGOING', 'COMPLETED'],
    example: 'PENDING'
  })
  @IsString()
  status: 'PENDING' | 'ONGOING' | 'COMPLETED';

  @ApiProperty({ 
    description: '상태 변경 사유 (선택)', 
    required: false,
    example: '개인 사정으로 인한 포기'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}