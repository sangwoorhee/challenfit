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

  // 1. 도전방 입장
  @Post('enter')
  @UseGuards(JwtAuthGuard)
  async enterChallengeRoom(
    @Body() enterChallengeRoomDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant = await this.challengeparticipantService.enterChallengeRoom(enterChallengeRoomDto.challenge_room_idx, user.idx);
    return { idx: participant.idx };
  }

  // 2. 도전 참가
  @Post('participate')
  @UseGuards(JwtAuthGuard)
  async participateChallengeRoom(
    @Body() participateChallengeRoomDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant = await this.challengeparticipantService.participateChallengeRoom(participateChallengeRoomDto.challenge_room_idx, user.idx);
    return { idx: participant.idx };
  }
}