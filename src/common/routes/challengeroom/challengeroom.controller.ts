import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { ChallengeroomService } from './challengeroom.service';
import {
  CreateChallengeRoomReqDto,
  JoinChallengeRoomReqDto,
  KickParticipantReqDto,
} from './dto/req.dto';
import {
  CreateChallengeRoomResDto,
  GetChallengeRoomsResDto,
} from './dto/res.dto';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';

@ApiTags('도전 방')
@Controller('challengeroom')
export class ChallengeroomController {
  constructor(private readonly challengeroomService: ChallengeroomService) {}

  // 1. 도전방 생성
  // POST : http://localhost:3000/challengeroom
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 생성',
    description: 'POST : http://localhost:3000/challengeroom',
  })
  async createChallengeRoom(
    @Body() dto: CreateChallengeRoomReqDto,
    @User() user: UserAfterAuth,
  ) {
    return await this.challengeroomService.createChallengeRoom(user.idx, dto);
  }

  // 2. 도전방 목록조회
  // GET : http://localhost:3000/challengeroom
  @Get()
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 목록조회',
    description: 'GET : http://localhost:3000/challengeroom',
  })
  async getChallengeRooms(): Promise<GetChallengeRoomsResDto> {
    return await this.challengeroomService.getChallengeRooms();
  }

  // 3. 도전방 상세조회
  // GET : http://localhost:3000/challengeroom/:challengeroom_idx
  @Get(':idx')
  @ApiOperation({
    summary: '도전방 상세조회',
    description: 'GET : http://localhost:3000/challengeroom/:challengeroom_idx',
  })
  async getChallengeRoomDetail(
    @Param('idx') idx: string,
  ): Promise<{result: string, data: ChallengeRoom}> {
    return await this.challengeroomService.getChallengeRoomDetail(idx);
  }
}
