import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { DurationUnit } from 'src/common/enum/enum';

// 챌린지방 생성 요청 DTO
export class CreateChallengeRoomReqDto {
  @IsString()
  title: string;

  // @IsOptional()
  // @IsString()
  // description?: string;

  @IsOptional()
  @IsString()
  goal: string;

  @IsInt()
  duration_value: number;

  @IsEnum(DurationUnit)
  duration_unit: DurationUnit;

  @IsInt()
  max_participants: number;

  // @IsBoolean()
  // isPublic: boolean;
}

// 도전방 참가 요청
export class JoinChallengeRoomReqDto {
  @IsString()
  challengeRoomIdx: string;
}

// 참가자 강퇴
export class KickParticipantReqDto {
  @IsString()
  challengeRoomIdx: string;

  @IsString()
  targetUserIdx: string;
}
