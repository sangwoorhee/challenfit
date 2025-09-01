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
import {
  BadRequestException,
  Logger,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PrivateChatService } from './private-chat.service';
import { WsJwtGuard } from 'src/common/guard/ws-jwt.guard';
import { WsThrottlerGuard } from 'src/common/guard/ws-throttler.guard';
import { RedisPubSubService } from '../../services/redis-pubsub.service';
import { WebSocketLoggingInterceptor } from 'src/common/interceptor/ws-logging.interceptor';

interface JoinPrivateRoomDto {
  chatRoomIdx: string;
  userIdx: string;
}

interface SendPrivateMessageDto {
  chatRoomIdx: string;
  message: string;
  userIdx: string;
  messageType?: string;
  attachmentUrl?: string;
}

interface TypingDto {
  chatRoomIdx: string;
  userIdx: string;
  isTyping: boolean;
}

interface MarkAsReadDto {
  chatRoomIdx: string;
  userIdx: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  },
  namespace: 'private-chat',
  transports: ['websocket', 'polling'],
})
@UseInterceptors(WebSocketLoggingInterceptor)
export class PrivateChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('PrivateChatGateway');
  private connectedClients: Map<
    string,
    { userIdx: string; rooms: Set<string> }
  > = new Map();

  // 온라인 사용자 추적을 위한 Map 추가
  private onlineUsers: Map<string, Set<string>> = new Map(); // userIdx -> Set<socketId>
  private userRooms: Map<string, Set<string>> = new Map(); // userIdx -> Set<roomName>
  private isRedisAvailable = true;

  constructor(
    private readonly privateChatService: PrivateChatService,
    private readonly redisPubSub: RedisPubSubService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Private Chat WebSocket Gateway initialized');

    // 서버 간 메시지 동기화를 위한 Redis 구독
    this.subscribeToRedis();
  }

  private async subscribeToRedis() {
    try {
      await this.redisPubSub.subscribe('private-chat:broadcast', async (data) => {
        const { room, event, payload } = data;
        this.server.to(room).emit(event, payload);
      });
      this.logger.log('Successfully subscribed to Redis pub/sub for private chat');
    } catch (error) {
      this.logger.warn(
        'Redis pub/sub not available for private chat. Running in single-server mode.',
      );
      this.isRedisAvailable = false;
    }
  }

  async handleConnection(client: Socket) {
    this.logger.debug(`Private chat client attempting to connect: ${client.id}`);
    try {
      const token =
        client.handshake.headers.authorization?.replace('Bearer ', '') ||
        client.handshake.auth?.token;
      
      const userInfo = await this.privateChatService.validateToken(token);

      if (!userInfo) {
        this.logger.error(`No user info, disconnecting private chat client: ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.user = userInfo;
      this.connectedClients.set(client.id, {
        userIdx: userInfo.idx,
        rooms: new Set(),
      });

      // 온라인 사용자 추가
      if (!this.onlineUsers.has(userInfo.idx)) {
        this.onlineUsers.set(userInfo.idx, new Set());
      }
      const userSocketSet = this.onlineUsers.get(userInfo.idx);
      if (userSocketSet) {
        userSocketSet.add(client.id);
      }

      this.logger.log(`Private chat client connected: ${client.id}, User: ${userInfo.idx}`);
    } catch (error) {
      this.logger.error(
        `Private chat connection error for client ${client.id}: ${error.message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);

    if (clientInfo) {
      // 온라인 사용자에서 제거
      const userSockets = this.onlineUsers.get(clientInfo.userIdx);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.onlineUsers.delete(clientInfo.userIdx);
          // 유저가 완전히 오프라인이 되면 userRooms에서도 제거
          this.userRooms.delete(clientInfo.userIdx);
        }
      }

      this.connectedClients.delete(client.id);
    }

    this.logger.log(`Private chat client disconnected: ${client.id}`);
  }

  // 1. 일대일 채팅방 입장
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinPrivateRoom')
  async handleJoinPrivateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinPrivateRoomDto,
  ) {
    const { chatRoomIdx, userIdx } = data;
    const roomName = `private-room-${chatRoomIdx}`;

    try {
      // 룸 참가
      client.join(roomName);

      // 클라이언트 룸 정보 업데이트
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        clientInfo.rooms.add(roomName);
      }

      // 유저의 현재 룸 추적
      if (!this.userRooms.has(userIdx)) {
        this.userRooms.set(userIdx, new Set());
      }
      const currentUserRooms = this.userRooms.get(userIdx);
      if (currentUserRooms) {
        currentUserRooms.add(chatRoomIdx);
      }

      // 채팅방 정보 가져오기
      const roomInfo = await this.privateChatService.getChatRoomInfo(chatRoomIdx);
      const otherUserIdx = roomInfo.user1.idx === userIdx ? roomInfo.user2.idx : roomInfo.user1.idx;

      // 상대방이 같은 방에 있는지 확인
      const otherUserRooms = this.userRooms.get(otherUserIdx);
      const isOtherUserInRoom = otherUserRooms ? otherUserRooms.has(chatRoomIdx) : false;

      // 채팅방 메시지 읽음 처리
      await this.privateChatService.markChatRoomMessagesAsRead(chatRoomIdx, userIdx);

      // 상대방이 같은 방에 있으면 실시간 읽음 처리 알림
      if (isOtherUserInRoom) {
        client.to(roomName).emit('messagesMarkedAsRead', {
          userIdx,
          chatRoomIdx,
          timestamp: new Date(),
        });
      }
      
      // 상대방에게 온라인 상태 알림
      if (this.isRedisAvailable) {
        await this.redisPubSub.publish('private-chat:broadcast', {
          room: roomName,
          event: 'userOnline',
          payload: {
            userIdx,
            nickname: client.data.user.nickname,
            timestamp: new Date(),
          },
        });
      } else {
        this.server.to(roomName).emit('userOnline', {
          userIdx,
          nickname: client.data.user.nickname,
          timestamp: new Date(),
        });
      }

      client.emit('joinedPrivateRoom', {
        chatRoomIdx,
        message: '채팅방에 입장하였습니다.',
        isOtherUserOnline: isOtherUserInRoom, // 상대방 온라인 상태 추가
      });

      this.logger.log(`User ${userIdx} joined private room ${chatRoomIdx}`);
    } catch (error) {
      this.logger.error(`Join private room error: ${error.message}`);
      client.emit('error', {
        code: 'JOIN_PRIVATE_ROOM_ERROR',
        message: '채팅방 입장 중 오류가 발생했습니다.',
      });
    }
  }

  // 2. 일대일 메시지 전송
  @UseGuards(WsJwtGuard, WsThrottlerGuard)
  @SubscribeMessage('sendPrivateMessage')
  async handleSendPrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendPrivateMessageDto,
  ) {
    const { chatRoomIdx, message, userIdx, messageType, attachmentUrl } = data;
    const roomName = `private-room-${chatRoomIdx}`;

    this.logger.debug(`Received sendPrivateMessage event: ${JSON.stringify(data)}`);
    
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
      const savedMessage = await this.privateChatService.sendPrivateMessage({
        senderIdx: userIdx,
        chatRoomIdx,
        message,
        messageType: messageType || 'text',
        attachmentUrl,
      });

      // 채팅방 정보 가져오기
      const roomInfo = await this.privateChatService.getChatRoomInfo(chatRoomIdx);
      const receiverIdx = roomInfo.user1.idx === userIdx ? roomInfo.user2.idx : roomInfo.user1.idx;

      // 상대방이 같은 방에 있는지 확인
      const receiverRooms = this.userRooms.get(receiverIdx);
      const isReceiverInRoom = receiverRooms ? receiverRooms.has(chatRoomIdx) : false;

      // 상대방이 방에 있으면 즉시 읽음 처리
      let isRead = false;
      if (isReceiverInRoom) {
        await this.privateChatService.markMessageAsRead(savedMessage.idx, receiverIdx);
        isRead = true;
      }

      // 저장된 메시지 로그 출력 (디버깅용)
      this.logger.debug(`Private message saved: ${JSON.stringify(savedMessage)}`);

      // 응답 포맷 변환
      const formattedMessage = {
        idx: savedMessage.idx,
        message: savedMessage.message,
        messageType: savedMessage.message_type,
        attachmentUrl: savedMessage.attachment_url,
        isDeleted: false,
        isRead: isRead, // 실시간 읽음 상태 반영
        createdAt: savedMessage.created_at,
        sender: {
          idx: savedMessage.sender.idx,
          nickname: savedMessage.sender.nickname,
          profileImageUrl: savedMessage.sender.profile?.profile_image_url || null,
        },
      };

      // 모든 서버의 클라이언트에게 전송
      if (this.isRedisAvailable) {
        await this.redisPubSub.publish('private-chat:broadcast', {
          room: roomName,
          event: 'newPrivateMessage',
          payload: formattedMessage,
        });
      } else {
        this.server.to(roomName).emit('newPrivateMessage', formattedMessage);
      }

      this.logger.log(`Private message sent in room ${chatRoomIdx} by user ${userIdx}`);
    } catch (error) {
      this.logger.error(`Send private message error: ${error.message}`);
      client.emit('error', {
        code: 'SEND_PRIVATE_MESSAGE_ERROR',
        message: '메시지 전송 중 오류가 발생했습니다.',
      });
    }
  }

  // 3. 메시지 삭제
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('deletePrivateMessage')
  async handleDeletePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageIdx: string; userIdx: string; chatRoomIdx: string },
  ) {
    const { messageIdx, userIdx, chatRoomIdx } = data;
    const roomName = `private-room-${chatRoomIdx}`;

    try {
      const deletedMessage = await this.privateChatService.deletePrivateMessage(
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
      if (this.isRedisAvailable) {
        await this.redisPubSub.publish('private-chat:broadcast', {
          room: roomName,
          event: 'privateMessageDeleted',
          payload: { messageIdx },
        });
      } else {
        this.server.to(roomName).emit('privateMessageDeleted', { messageIdx });
      }

      this.logger.log(`Private message ${messageIdx} deleted by user ${userIdx}`);
    } catch (error) {
      this.logger.error(`Delete private message error: ${error.message}`);
      client.emit('error', {
        code: 'DELETE_PRIVATE_MESSAGE_ERROR',
        message: '메시지 삭제 중 오류가 발생했습니다.',
      });
    }
  }

  // 4. 타이핑 상태 브로드캐스트
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('privateTyping')
  async handlePrivateTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingDto,
  ) {
    const { chatRoomIdx, userIdx, isTyping } = data;
    const roomName = `private-room-${chatRoomIdx}`;

    // 타이핑 상태 브로드캐스트 (자신 제외)
    client.to(roomName).emit('userPrivateTyping', {
      userIdx,
      nickname: client.data.user.nickname,
      isTyping,
    });
  }

  // 5. 메시지 읽음 상태 브로드캐스트
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markPrivateMessagesAsRead')
  async handleMarkPrivateMessagesAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkAsReadDto,
  ) {
    const { chatRoomIdx, userIdx } = data;
    const roomName = `private-room-${chatRoomIdx}`;

    try {
      await this.privateChatService.markChatRoomMessagesAsRead(chatRoomIdx, userIdx);

      // 상대방에게 읽음 상태 알림
      client.to(roomName).emit('messagesMarkedAsRead', {
        userIdx,
        chatRoomIdx,
        timestamp: new Date(),
      });

      this.logger.log(`Messages marked as read in room ${chatRoomIdx} by user ${userIdx}`);
    } catch (error) {
      this.logger.error(`Mark messages as read error: ${error.message}`);
      client.emit('error', {
        code: 'MARK_AS_READ_ERROR',
        message: '메시지 읽음 처리 중 오류가 발생했습니다.',
      });
    }
  }

  // 6. 일대일 채팅방 나가기
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leavePrivateRoom')
  async handleLeavePrivateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatRoomIdx: string; userIdx: string },
  ) {
    const { chatRoomIdx, userIdx } = data;
    const roomName = `private-room-${chatRoomIdx}`;

    try {
      client.leave(roomName);
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) clientInfo.rooms.delete(roomName);

      // userRooms에서 제거
      const userRoomSet = this.userRooms.get(userIdx);
      if (userRoomSet) {
        userRoomSet.delete(chatRoomIdx);
        if (userRoomSet.size === 0) {
          this.userRooms.delete(userIdx);
        }
      }

      // 상대방에게 오프라인 상태 알림
      if (this.isRedisAvailable) {
        await this.redisPubSub.publish('private-chat:broadcast', {
          room: roomName,
          event: 'userOffline',
          payload: {
            userIdx,
            nickname: client.data.user.nickname,
            timestamp: new Date(),
          },
        });
      } else {
        this.server.to(roomName).emit('userOffline', {
          userIdx,
          nickname: client.data.user.nickname,
          timestamp: new Date(),
        });
      }

      this.logger.log(`User ${userIdx} left private room ${chatRoomIdx}`);
    } catch (error) {
      this.logger.error(`Leave private room error: ${error.message}`);
    }
  }
}
