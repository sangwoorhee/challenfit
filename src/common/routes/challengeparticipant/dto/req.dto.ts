import { IsString } from 'class-validator';

// 도전 방 참가
export class JoinChallengeRoomReqDto {
  @IsString()
  challenge_room_idx: string;
}