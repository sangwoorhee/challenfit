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

  // 1. 도전 방 참가
  @Post('join')
  @UseGuards(JwtAuthGuard)
  async joinChallengeRoom(
    @Body() joinChallengeRoomDto: JoinChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ): Promise<JoinChallengeRoomResDto> {
    const participant = await this.challengeparticipantService.joinChallengeRoom(joinChallengeRoomDto.challenge_room_idx, user.idx);
    return { idx: participant.idx };
  }
}
