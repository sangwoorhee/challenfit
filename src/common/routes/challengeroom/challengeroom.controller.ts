import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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
  GetChallengeRoomDetailResDto,
  GetChallengeRoomsResDto,
} from './dto/res.dto';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { PageReqDto } from 'src/common/dto/req.dto';

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

  // 2. 도전방 목록조회 (페이지네이션 추가)
  // GET : http://localhost:3000/challengeroom?page=1&size=10
  @Get()
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 목록조회 (페이지네이션)',
    description: 'GET : http://localhost:3000/challengeroom?page=1&size=10\n\n도전방 생성자의 프로필 이미지 URL도 함께 반환합니다.',
  })
  async getChallengeRooms(
    @Query() pageReqDto: PageReqDto,
  ): Promise<GetChallengeRoomsResDto> {
    const { page, size } = pageReqDto;
    return await this.challengeroomService.getChallengeRooms(page, size);
  }

  /// 3. 도전방 상세조회
  // GET : http://localhost:3000/challengeroom/:challengeroom_idx
  @Get(':idx')
  // @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 상세조회',
    description: 'GET : http://localhost:3000/challengeroom/:challengeroom_idx',
  })
  async getChallengeRoomDetail(
    @Param('idx') idx: string,
  ): Promise<GetChallengeRoomDetailResDto> {
    return await this.challengeroomService.getChallengeRoomDetail(idx);
  }
}
