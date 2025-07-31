import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { GetMessagesDto } from './dto/req.dto';
import { GetMessagesResponseDto } from './dto/res.dto';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';

@ApiTags('채팅')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // 1. 도전방 채팅 메시지 조회
  // GET: http://localhost:3000/chat/room/:challengeRoomIdx/messages
  @Get('room/:challengeRoomIdx/messages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 채팅 메시지 조회',
    description:
      'GET: http://localhost:3000/chat/room/:challengeRoomIdx/messages',
  })
  async getMessages(
    @Param('challengeRoomIdx') challengeRoomIdx: string,
    @Query() query: GetMessagesDto,
    @User() user: UserAfterAuth,
  ): Promise<GetMessagesResponseDto> {
    const userIdx = user.idx;

    // // 참가자 확인
    // const isParticipant = await this.chatService.checkParticipant(
    //   userIdx,
    //   challengeRoomIdx,
    // );

    // if (!isParticipant) {
    //   throw new HttpException(
    //     '도전방 참가자만 메시지를 조회할 수 있습니다.',
    //     HttpStatus.FORBIDDEN,
    //   );
    // }

    // 채팅 내역 조회 (프로필 이미지 포함)
    const chatHistory = await this.chatService.getChatHistoryWithProfile(
      challengeRoomIdx,
      query.page,
      query.limit,
      query.beforeTimestamp,
    );

    return {
      result: 'ok',
      messages: chatHistory.data,
      pagination: chatHistory.pagination,
      challengeRoomIdx,
    };
  }

  // 2. 도전방 채팅 메시지 내보내기
  // GET: http://localhost:3000/chat/room/:challengeRoomIdx/messages/export
  @Get('room/:challengeRoomIdx/messages/export')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 채팅 메시지 내보내기',
    description:
      'GET: http://localhost:3000/chat/room/:challengeRoomIdx/messages/export',
  })
  async exportMessages(
    @Param('challengeRoomIdx') challengeRoomIdx: string,
    @Query() query: GetMessagesDto,
    @User() user: UserAfterAuth,
  ): Promise<any> {
    const userIdx = user.idx;

    // 참가자 확인
    const isParticipant = await this.chatService.checkParticipant(
      userIdx,
      challengeRoomIdx,
    );

    if (!isParticipant) {
      throw new HttpException(
        '도전방 참가자만 메시지를 조회할 수 있습니다.',
        HttpStatus.FORBIDDEN,
      );
    }

    // 날짜 파싱
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    // 대량 메시지 조회 (프로필 이미지 포함)
    const messages = await this.chatService.exportChatHistoryWithProfile(
      challengeRoomIdx,
      startDate,
      endDate,
    );

    return {
      result: 'ok',
      messages,
      challengeRoomIdx,
      exportDate: new Date(),
      totalCount: messages.length,
    };
  }

  // 3. 도전방 온라인 사용자 조회
  // GET: http://localhost:3000/chat/room/:challengeRoomIdx/online-users
  @Get('room/:challengeRoomIdx/online-users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '도전방 온라인 사용자 조회',
    description:
      'GET: http://localhost:3000/chat/room/:challengeRoomIdx/online-users',
  })
  async getOnlineUsers(
    @Param('challengeRoomIdx') challengeRoomIdx: string,
    @User() user: UserAfterAuth,
  ): Promise<any> {
    const userIdx = user.idx;

    // 참가자 확인
    const isParticipant = await this.chatService.checkParticipant(
      userIdx,
      challengeRoomIdx,
    );

    if (!isParticipant) {
      throw new HttpException(
        '도전방 참가자만 조회할 수 있습니다.',
        HttpStatus.FORBIDDEN,
      );
    }

    // 도전방의 온라인 사용자 목록 조회 (프로필 이미지 포함)
    const onlineUsers =
      await this.chatService.getRoomOnlineUsersWithProfile(challengeRoomIdx);

    return {
      result: 'ok',
      onlineUsers,
      challengeRoomIdx,
      totalCount: onlineUsers.length,
    };
  }

  // Socket.IO 연결 테스트
  @Get('test')
  @ApiOperation({ summary: 'Socket.IO 연결 테스트' })
  async testConnection(): Promise<any> {
    return {
      result: 'ok',
      message: 'Chat service is running',
      socketUrl: `ws://${process.env.EC2_PUBLIC_IP || 'localhost'}:3000/chat`,
      timestamp: new Date()
    };
  }
}
