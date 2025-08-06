// src/common/routes/challengeparticipant/challengeparticipant.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ChallengeparticipantService } from './challengeparticipant.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { JoinChallengeRoomReqDto } from './dto/req.dto';
import { GetActiveParticipationResDto, JoinChallengeRoomResDto } from './dto/res.dto';

@ApiTags('도전 방 참가자')
@Controller('challengeparticipant')
export class ChallengeparticipantController {
  constructor(
    private readonly challengeparticipantService: ChallengeparticipantService,
  ) {}

  // 1. 현재 진행 중인 도전 조회 (도전글 작성 시 사용)
  // GET : http://localhost:3000/challengeparticipant/active
  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '현재 진행 중인 도전 조회',
    description:
      'GET : http://localhost:3000/challengeparticipant/active\n\n도전글 작성 시 자동으로 연결할 challenge_participant_idx를 조회합니다.',
  })
  async getActiveParticipation(
    @User() user: UserAfterAuth,
  ): Promise<GetActiveParticipationResDto> {
    const activeParticipant =
      await this.challengeparticipantService.getActiveParticipation(user.idx);
    
    return {
      result: 'ok',
      challenge_participant_idx: activeParticipant?.idx || null,
      challenge_room_idx: activeParticipant?.challenge?.idx || null,
    };
  }

  // 2. 도전 참가 (입장한 사용자가 ONGOING 상태로 전환)
  // POST : http://localhost:3000/challengeparticipant/
  @Post('')
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

  // 3. 도전 참가 취소 ( 상태를 PENDING으로 변경)
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
