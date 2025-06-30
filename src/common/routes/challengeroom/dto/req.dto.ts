import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import { DurationUnit } from "src/common/enum/enum";

// 챌린지방 생성 요청 DTO
  export class CreateChallengeRoomReqDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    goal: string;

    @IsDateString()
    start_date: string;

    @IsInt()
    duration_value: number;

    @IsEnum(DurationUnit)
    duration_unit: DurationUnit;

    @IsInt()
    max_participants: number;

    @IsBoolean()
    is_public: boolean;
  }

  
  // 도전방 참가 요청
  export class JoinChallengeRoomReqDto {
    @IsString()
    challenge_room_idx: string;
  }
  
  // 참가자 강퇴
  export class KickParticipantReqDto {
    @IsString()
    challenge_room_idx: string;
  
    @IsString()
    target_user_idx: string;
  }
  