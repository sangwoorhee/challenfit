import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    UseGuards,
    HttpException,
    HttpStatus,
    Body,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
  } from '@nestjs/swagger';
  import { EntryService } from './entry.service';
  import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
  import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
  import { CreateParticipantDto } from './dto/req.dto';
  import {
    ParticipantsListResponseDto,
    ParticipateSuccessResponseDto,
    CancelParticipationResponseDto,
    RoomInfoResponseDto,
    TestConnectionResponseDto,
    EntryErrorResponseDto,
  } from './dto/res.dto';
  
  @ApiTags('엔트리 (도전 참여 실시간)')
  @Controller('entry')
  export class EntryController {
    constructor(private readonly entryService: EntryService) {}
  
    // 1. 도전방 참가자 목록 조회
    @Get('room/:challengeRoomIdx/participants')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
      summary: '도전방 참가자 목록 조회',
      description: 'GET: http://localhost:3000/entry/room/:challengeRoomIdx/participants',
    })
    async getParticipants(
      @Param('challengeRoomIdx') challengeRoomIdx: string,
      @User() user: UserAfterAuth,
    ): Promise<ParticipantsListResponseDto> {
      try {
        const participants = await this.entryService.getChallengeParticipants(challengeRoomIdx);
        return {
          result: 'ok',
          participants,
          totalCount: participants.length,
          challengeRoomIdx,
        };
      } catch (error) {
        throw new HttpException(
          error.message || '참가자 목록 조회 중 오류가 발생했습니다.',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    // 2. 도전방 참여
    @Post('room/:challengeRoomIdx/participate')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
      summary: '도전방 참여',
      description: 'POST: http://localhost:3000/entry/room/:challengeRoomIdx/participate',
    })
    async participate(
      @Param('challengeRoomIdx') challengeRoomIdx: string,
      @User() user: UserAfterAuth,
      @Body() body?: CreateParticipantDto,
    ): Promise<ParticipateSuccessResponseDto> {
      try {
        const participant = await this.entryService.createParticipant(challengeRoomIdx, user.idx);
        return {
          result: 'ok',
          message: '도전 참여가 완료되었습니다.',
          participant: {
            userIdx: participant.user.idx,
            nickname: participant.user.nickname,
            profileImageUrl: participant.user.profile?.profile_image_url || undefined,
            joinedAt: participant.joined_at,
            status: participant.status,
          },
          currentParticipants: participant.challenge.current_participants,
          maxParticipants: participant.challenge.max_participants,
        };
      } catch (error) {
        throw new HttpException(
          error.message || '도전 참여 중 오류가 발생했습니다.',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    // 3. 도전방 참여 취소
    @Delete('room/:challengeRoomIdx/participate')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
      summary: '도전방 참여 취소',
      description: 'DELETE: http://localhost:3000/entry/room/:challengeRoomIdx/participate',
    })
    async cancelParticipation(
      @Param('challengeRoomIdx') challengeRoomIdx: string,
      @User() user: UserAfterAuth,
    ): Promise<CancelParticipationResponseDto> {
      try {
        await this.entryService.removeParticipant(challengeRoomIdx, user.idx);
        return {
          result: 'ok',
          message: '도전 참여가 취소되었습니다.',
          canceledAt: new Date(),
        };
      } catch (error) {
        throw new HttpException(
          error.message || '도전 참여 취소 중 오류가 발생했습니다.',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    // 4. 도전방 정보 조회
    @Get('room/:challengeRoomIdx/info')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
      summary: '도전방 정보 조회',
      description: 'GET: http://localhost:3000/entry/room/:challengeRoomIdx/info',
    })
    async getRoomInfo(
      @Param('challengeRoomIdx') challengeRoomIdx: string,
      @User() user: UserAfterAuth,
    ): Promise<RoomInfoResponseDto> {
      try {
        const roomInfo = await this.entryService.getChallengeRoomInfo(challengeRoomIdx);
        const isParticipant = await this.entryService.isParticipant(user.idx, challengeRoomIdx);
        const canJoin = 
          roomInfo.status === '대기중' && 
          roomInfo.current_participants < roomInfo.max_participants && 
          !isParticipant;
  
        return {
          result: 'ok',
          room: {
            idx: roomInfo.idx,
            title: roomInfo.title,
            goal: roomInfo.goal,
            status: roomInfo.status,
            maxParticipants: roomInfo.max_participants,
            currentParticipants: roomInfo.current_participants,
            isPublic: roomInfo.is_public,
            createdAt: roomInfo.created_at,
            startDate: roomInfo.start_date || undefined,
            endDate: roomInfo.end_date || undefined,
          },
          isParticipant,
          canJoin,
        };
      } catch (error) {
        throw new HttpException(
          error.message || '도전방 정보 조회 중 오류가 발생했습니다.',
          error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  
    // Socket.IO 연결 테스트
    @Get('test')
    @ApiOperation({ summary: 'Entry Socket.IO 연결 테스트' })
    @ApiResponse({ status: 200, type: TestConnectionResponseDto })
    async testConnection(): Promise<TestConnectionResponseDto> {
      return {
        result: 'ok',
        message: 'Entry service is running',
        socketUrl: `ws://${process.env.EC2_PUBLIC_IP || 'localhost'}:3000/entry`,
        timestamp: new Date(),
        description: '도전 참여 실시간 업데이트를 위한 소켓 서비스',
      };
    }
  }