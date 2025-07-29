import { ApiProperty } from '@nestjs/swagger';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengeStatus, DurationUnit } from 'src/common/enum/enum';

export class CreateChallengeRoomResDto {
  @ApiProperty({ description: '결과' })
  result: string;

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
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '현재 페이지' })
  page: number;

  @ApiProperty({ description: '페이지 크기' })
  size: number;

  @ApiProperty({ description: '전체 아이템 수' })
  totalCount: number;

  @ApiProperty({ description: '도전방 목록' })
  challengeRooms: ChallengeRoomFeedDto[];
}

// 도전 방 상세조회
export class ChallengeRoomDetailDto {
  roomId: string;
  title: string;
  status: ChallengeStatus;
  duration_unit: DurationUnit;
  duration_value: number;
  goal: string;
  start_date: Date | null;
  end_date: Date | null;
  currentMemberCount: number;
  maxMembers: number;
  creatorProfileImageUrl: string | null;
  members: {
    user_idx: string;
    nickname: string;
    imgUrl: string | null;
  }[];
}

export class GetChallengeRoomDetailResDto {
  result: string;
  challengeRoom: ChallengeRoomDetailDto;
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
