import { ApiProperty } from '@nestjs/swagger';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';

// 도전 방 참가
export class JoinChallengeRoomResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '참가자 ID' })
  idx: string;
}

// 도전 방 목록조회
export class GetChallengeRoomsResDto {
    @ApiProperty({ description: '도전방 목록' })
    challengeRooms: ChallengeRoom[];
  }