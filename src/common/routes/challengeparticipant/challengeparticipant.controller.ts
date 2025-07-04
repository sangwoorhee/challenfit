// src/common/routes/challengeparticipant/challengeparticipant.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ChallengeparticipantService } from './challengeparticipant.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { JoinChallengeRoomReqDto } from './dto/req.dto';
import { JoinChallengeRoomResDto } from './dto/res.dto';

@ApiTags('도전 방 참가자')
@Controller('challengeparticipant')
export class ChallengeparticipantController {
  constructor(private readonly challengeparticipantService: ChallengeparticipantService) {}

  // 1. 도전방 입장 (사용자가 도전방에 입장하여 상태를 PENDING으로 설정)
  @Post('enter')
  @UseGuards(JwtAuthGuard)
  async enterChallengeRoom(
    @Body() enterChallengeRoomDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant = await this.challengeparticipantService.enterChallengeRoom(enterChallengeRoomDto.challenge_room_idx, user.idx);
    return { idx: participant.idx };
  }

  // 2. 도전 참가 (입장한 사용자가 PARTICIPATING 상태로 전환)
  @Post('participate')
  @UseGuards(JwtAuthGuard)
  async participateChallengeRoom(
    @Body() participateChallengeRoomDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant = await this.challengeparticipantService.participateChallengeRoom(participateChallengeRoomDto.challenge_room_idx, user.idx);
    return { idx: participant.idx };
  }

  // 3. 도전 참가 취소 (PARTICIPATING 상태를 PENDING으로 변경)
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelParticipation(
    @Body() cancelDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant = await this.challengeparticipantService.cancelParticipation(cancelDto.challenge_room_idx, user.idx);
    return { idx: participant.idx };
  }
}