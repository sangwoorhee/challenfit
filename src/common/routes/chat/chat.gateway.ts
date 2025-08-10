import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from 'src/common/guard/ws-jwt.guard';
import { WsThrottlerGuard } from 'src/common/guard/ws-throttler.guard';
import { RedisPubSubService } from '../../services/redis-pubsub.service';
import { WebSocketLoggingInterceptor } from 'src/common/interceptor/ws-logging.interceptor';

interface JoinRoomDto {
  challengeRoomIdx: string;
  userIdx: string;
}

interface SendMessageDto {
  challengeRoomIdx: string;
  message: string;
  userIdx: string;
  messageType?: string;
  attachmentUrl?: string;
}

interface PaginationDto {
  challengeRoomIdx: string;
  page?: number;
  limit?: number;
  beforeTimestamp?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  },
  namespace: 'chat',
  transports: ['websocket', 'polling'], // 폴백 지원
})
@UseInterceptors(WebSocketLoggingInterceptor)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private connectedClients: Map<
    string,
    { userIdx: string; rooms: Set<string> }
  > = new Map();
  private isRedisAvailable = true;

  constructor(
    private readonly chatService: ChatService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // 서버 간 메시지 동기화를 위한 Redis 구독 (Redis 사용 가능한 경우에만)
    this.subscribeToRedis();
  }

  private async subscribeToRedis() {
    try {
      await this.redisPubSub.subscribe('chat:broadcast', async (data) => {
        const { room, event, payload } = data;
        this.server.to(room).emit(event, payload);
      });
      this.logger.log('Successfully subscribed to Redis pub/sub');
    } catch (error) {
      this.logger.warn(
        'Redis pub/sub not available. Running in single-server mode.',
      );
      this.isRedisAvailable = false;
    }
  }

  async handleConnection(client: Socket) {
    this.logger.debug(`Client attempting to connect: ${client.id}`);
    try {
      const token =
        client.handshake.headers.authorization?.replace('Bearer ', '') ||
        client.handshake.auth?.token;
      this.logger.debug(`Received token: ${token || 'none'}`);
      const userInfo = await this.chatService.validateToken(token);
      this.logger.debug(`User info: ${JSON.stringify(userInfo) || 'none'}`);

      if (!userInfo) {
        this.logger.error(`No user info, disconnecting client: ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.user = userInfo;
      this.connectedClients.set(client.id, {
        userIdx: userInfo.idx,
        rooms: new Set(),
      });

      this.logger.log(`Client connected: ${client.id}, User: ${userInfo.idx}`);
      await this.chatService.updateUserStatus(userInfo.idx, 'online');
    } catch (error) {
      this.logger.error(
        `Connection error for client ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      // 모든 룸에서 나가기
      for (const room of clientInfo.rooms) {
        await this.handleLeaveRoom(client, {
          challengeRoomIdx: room.replace('room-', ''),
          userIdx: clientInfo.userIdx,
        });
      }

      // 연결 상태 업데이트
      await this.chatService.updateUserStatus(clientInfo.userIdx, 'offline');

      this.connectedClients.delete(client.id);
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // 1. 채팅방 (도전방)에 참가
  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    console.log('joinRoom called:', data);
    console.log('client.data.user:', client.data.user);
    console.log('client.handshake.auth:', client.handshake.auth);
    const { challengeRoomIdx, userIdx } = data;
    const roomName = `room-${challengeRoomIdx}`;

    try {
      // 참가자 확인
      const isParticipant = await this.chatService.checkParticipant(
        userIdx,
        challengeRoomIdx,
      );

      if (!isParticipant) {
        client.emit('error', {
          code: 'NOT_PARTICIPANT',
          message: '도전방 참가자가 아닙니다.',
        });
        return;
      }

      // 룸 참가
      client.join(roomName);

      // 클라이언트 룸 정보 업데이트
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.rooms.add(roomName);
      }

      // 채팅 내역 전송 (페이지네이션)
      const messages = await this.chatService.getChatHistory(
        challengeRoomIdx,
        1,
        50,
      );
      client.emit('chatHistory', {
        messages: messages.data,
        pagination: messages.pagination,
      });

      // 현재 접속자 목록 전송
      const onlineUsers =
        await this.chatService.getRoomOnlineUsers(challengeRoomIdx);
      client.emit('onlineUsers', onlineUsers);

      // 다른 서버의 클라이언트에게도 알림
      if (this.isRedisAvailable) {
        await this.redisPubSub.publish('chat:broadcast', {
          room: roomName,
          event: 'userJoined',
          payload: {
            userIdx,
            nickname: client.data.user.nickname,
            timestamp: new Date(),
          },
        });
      } else {
        // Redis 없이 현재 서버의 클라이언트에게만 브로드캐스트
        this.server.to(roomName).emit('userJoined', {
          userIdx,
          nickname: client.data.user.nickname,
          timestamp: new Date(),
        });
      }

      this.logger.log(`User ${userIdx} joined room ${challengeRoomIdx}`);
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
      client.emit('error', {
        code: 'JOIN_ERROR',
        message: '룸 참가 중 오류가 발생했습니다.',
      });
    }
  }

  // 2. 메시지 전송
  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ) {
    const { challengeRoomIdx, message, userIdx, messageType, attachmentUrl } =
      data;
    const roomName = `room-${challengeRoomIdx}`;

    this.logger.debug(`Received sendMessage event: ${JSON.stringify(data)}`);
    try {
      // 메시지 유효성 검사
      if (!message.trim() && messageType === 'text') {
        client.emit('error', {
          code: 'EMPTY_MESSAGE',
          message: '메시지 내용이 없습니다.',
        });
        return;
      }

      // 메시지 길이 제한
      if (message.length > 1000) {
        client.emit('error', {
          code: 'MESSAGE_TOO_LONG',
          message: '메시지가 너무 깁니다. (최대 1000자)',
        });
        return;
      }

      // 메시지 저장
      const savedMessage = await this.chatService.saveMessage({
        userIdx,
        challengeRoomIdx,
        message,
        messageType: messageType || 'text',
        attachmentUrl,
      });

      // 저장된 메시지 로그 출력 (디버깅용)
      this.logger.debug(`Message saved: ${JSON.stringify(savedMessage)}`);

      // 모든 서버의 클라이언트에게 전송
      if (this.isRedisAvailable) {
        await this.redisPubSub.publish('chat:broadcast', {
          room: roomName,
          event: 'newMessage',
          payload: savedMessage,
        });
      } else {
        // Redis 없이 현재 서버의 클라이언트에게만 브로드캐스트
        this.server.to(roomName).emit('newMessage', savedMessage);
      }

      // 푸시 알림 발송 (비동기)
      this.chatService
        .sendPushNotifications(challengeRoomIdx, userIdx, message)
        .catch((err) => this.logger.error('Push notification error:', err));
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      client.emit('error', {
        code: 'SEND_ERROR',
        message: '메시지 전송 중 오류가 발생했습니다.',
      });
    }
  }

  // 3. 이전 메시지 로드
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('loadMoreMessages')
  async handleLoadMoreMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: PaginationDto,
  ) {
    const { challengeRoomIdx, page = 1, limit = 50, beforeTimestamp } = data;

    try {
      const messages = await this.chatService.getChatHistory(
        challengeRoomIdx,
        page,
        limit,
        beforeTimestamp,
      );

      client.emit('moreMessages', {
        messages: messages.data,
        pagination: messages.pagination,
      });
    } catch (error) {
      this.logger.error(`Load more messages error: ${error.message}`);
      client.emit('error', {
        code: 'LOAD_ERROR',
        message: '메시지 로드 중 오류가 발생했습니다.',
      });
    }
  }

  // 4. 메시지 삭제
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageIdx: string; userIdx: string },
  ) {
    const { messageIdx, userIdx } = data;

    try {
      const deletedMessage = await this.chatService.deleteMessage(
        messageIdx,
        userIdx,
      );

      if (!deletedMessage) {
        client.emit('error', {
          code: 'DELETE_FAILED',
          message: '메시지를 삭제할 수 없습니다.',
        });
        return;
      }

      // 모든 서버의 클라이언트에게 삭제 알림
      const roomName = `room-${deletedMessage.challenge_room.idx}`;
      await this.redisPubSub.publish('chat:broadcast', {
        room: roomName,
        event: 'messageDeleted',
        payload: { messageIdx },
      });
    } catch (error) {
      this.logger.error(`Delete message error: ${error.message}`);
      client.emit('error', {
        code: 'DELETE_ERROR',
        message: '메시지 삭제 중 오류가 발생했습니다.',
      });
    }
  }

  // 5. 타이핑 상태 브로드캐스트
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { challengeRoomIdx: string; userIdx: string; isTyping: boolean },
  ) {
    const { challengeRoomIdx, userIdx, isTyping } = data;
    const roomName = `room-${challengeRoomIdx}`;

    // 타이핑 상태 브로드캐스트 (자신 제외)
    client.to(roomName).emit('userTyping', {
      userIdx,
      nickname: client.data.user.nickname,
      isTyping,
    });
  }

  // 6. 채팅방 나가기
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { challengeRoomIdx: string; userIdx: string },
  ) {
    const { challengeRoomIdx, userIdx } = data;
    const roomName = `room-${challengeRoomIdx}`;

    try {
      client.leave(roomName);

      // 클라이언트 룸 정보 업데이트
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.rooms.delete(roomName);
      }

      // 다른 서버의 클라이언트에게도 알림
      await this.redisPubSub.publish('chat:broadcast', {
        room: roomName,
        event: 'userLeft',
        payload: {
          userIdx,
          nickname: client.data.user.nickname,
          timestamp: new Date(),
        },
      });

      this.logger.log(`User ${userIdx} left room ${challengeRoomIdx}`);
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`);
    }
  }
}
