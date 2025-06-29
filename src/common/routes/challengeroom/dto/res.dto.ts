import { ApiProperty } from "@nestjs/swagger";
import { ChallengeRoom } from "src/common/entities/challenge_room.entity";

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
    challengeRooms: ChallengeRoom[];
  }

  // 도전 방 상세조회
  export class GetChallengeRoomDetailResDto {
    @ApiProperty({ description: '도전방 상세 정보' })
    challengeRoom: ChallengeRoom;
  }