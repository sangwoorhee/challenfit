// src/common/routes/challengeparticipant/challengeparticipant.controller.ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ChallengeparticipantService } from './challengeparticipant.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { JoinChallengeRoomReqDto } from './dto/req.dto';
import { JoinChallengeRoomResDto } from './dto/res.dto';

@ApiTags('도전 방 참가자')
@Controller('challengeparticipant')
export class ChallengeparticipantController {
  constructor(
    private readonly challengeparticipantService: ChallengeparticipantService,
  ) {}

  // 2. 도전 참가 (입장한 사용자가 PARTICIPATING 상태로 전환)
  // POST : http://localhost:3000/challengeparticipant/participate
  @Post('participate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전 참가',
    description:
      'POST : http://localhost:3000/challengeparticipant/participate',
  })
  async participateChallengeRoom(
    @Body() participateChallengeRoomDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant =
      await this.challengeparticipantService.participateChallengeRoom(
        participateChallengeRoomDto.challenge_room_idx,
        user.idx,
      );
    return { result: 'ok', idx: participant.idx };
  }

  // 3. 도전 참가 취소 (PARTICIPATING 상태를 PENDING으로 변경)
  // POST : http://localhost:3000/challengeparticipant/cancel
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전 참가',
    description: 'POST : http://localhost:3000/challengeparticipant/cancel',
  })
  async cancelParticipation(
    @Body() cancelDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant =
      await this.challengeparticipantService.cancelParticipation(
        cancelDto.challenge_room_idx,
        user.idx,
      );
    return { result: 'ok', idx: participant.idx };
  }
}
