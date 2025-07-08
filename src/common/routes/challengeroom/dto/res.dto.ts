import { ApiProperty } from '@nestjs/swagger';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengeStatus } from 'src/common/enum/enum';

export class CreateChallengeRoomResDto {
  @ApiProperty()
  idx: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  goal: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  start_date: Date;

  @ApiProperty()
  end_date: Date;

  @ApiProperty()
  duration_weeks: number;

  @ApiProperty()
  max_participants: number;

  @ApiProperty()
  current_participant_count: number;

  @ApiProperty()
  is_public: boolean;
}

// 도전 방 목록조회
export class GetChallengeRoomsResDto {
  @ApiProperty({ description: '도전방 목록' })
  challengeRooms: ChallengeRoomFeedDto[];
}

// 도전 방 상세조회
export class GetChallengeRoomDetailResDto {
  @ApiProperty({ description: '도전방 상세 정보' })
  challengeRoom: ChallengeRoom;
}

export class ChallengeRoomFeedDto {
  roomId: string;
  title: string;
  status: ChallengeStatus;
  goal: string;
  duration_unit: string;
  duration_value: number;
  currentMemberCount: number;
  maxMembers: number;
}
