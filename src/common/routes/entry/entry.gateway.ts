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
  import { EntryService } from './entry.service';
  import { WsJwtGuard } from 'src/common/guard/ws-jwt.guard';
  import { WsThrottlerGuard } from 'src/common/guard/ws-throttler.guard';
  import { RedisPubSubService } from '../../services/redis-pubsub.service';
  import { WebSocketLoggingInterceptor } from 'src/common/interceptor/ws-logging.interceptor';
  import { 
    JoinRoomDto, 
    ParticipateDto, 
    CancelParticipationDto,
    GetParticipantsDto,
    LeaveRoomDto 
  } from './dto/req.dto';
  import {
    ParticipantJoinedEventDto,
    ParticipantLeftEventDto,
    UserRoomEventDto,
    EntryErrorResponseDto,
    ParticipateSuccessResponseDto,
    CancelParticipationResponseDto,
    ParticipantsListResponseDto
  } from './dto/res.dto';
  
  @WebSocketGateway({
    cors: {
      origin: process.env.FRONTEND_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://3.34.199.169:3000',
        'http://3.34.199.169:3002',
        'http://10.0.2.2:3000',
        'http://localhost:7357',
        'http://localhost:8080',
        'http://10.0.2.2:3000',
        'http://127.0.0.1:3000',
        'http://43.200.3.200:3000',
        'http://43.200.3.200:3002',
        'http://43.200.3.200',
      ],
      credentials: true,
    },
    namespace: '/entry',
    transports: ['websocket', 'polling'],
  })
  @UseInterceptors(WebSocketLoggingInterceptor)
  export class EntryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private logger: Logger = new Logger('EntryGateway');
    private connectedClients: Map<string, { userIdx: string; rooms: Set<string> }> = new Map();
    private isRedisAvailable = true;
  
    constructor(
      private readonly entryService: EntryService,
      private readonly redisPubSub: RedisPubSubService,
    ) {}
  
    afterInit(server: Server) {
      this.logger.log('Entry WebSocket Gateway initialized');
      this.subscribeToRedis();
    }
  
    private async subscribeToRedis() {
      try {
        await this.redisPubSub.subscribe('entry:broadcast', async (data) => {
          const { room, event, payload } = data;
          this.server.to(room).emit(event, payload);
        });
        this.logger.log('Successfully subscribed to Redis pub/sub for entry');
      } catch (error) {
        this.logger.warn('Redis pub/sub not available for entry. Running in single-server mode.');
        this.isRedisAvailable = false;
      }
    }
  
    async handleConnection(client: Socket) {
      this.logger.log(`=== New entry connection attempt ===`);
      this.logger.log(`Client ID: ${client.id}`);
      
      try {
        const token =
          client.handshake.headers.authorization?.replace('Bearer ', '') ||
          client.handshake.auth?.token;
        
        const userInfo = await this.entryService.validateToken(token);
        
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
  
        this.logger.log(`Entry client connected: ${client.id}, User: ${userInfo.idx}`);
      } catch (error) {
        this.logger.error(`Entry connection error for client ${client.id}: ${error.message}`);
        client.disconnect();
      }
    }
  
    async handleDisconnect(client: Socket) {
      const clientInfo = this.connectedClients.get(client.id);
      if (clientInfo) {
        for (const room of clientInfo.rooms) {
          await this.handleLeaveRoom(client, {
            challengeRoomIdx: room.replace('entry-room-', ''),
            userIdx: clientInfo.userIdx,
          });
        }
        this.connectedClients.delete(client.id);
      }
      this.logger.log(`Entry client disconnected: ${client.id}`);
    }
  
    // 1. 도전방 입장 (소켓 연결)
    @UseGuards(WsJwtGuard, WsThrottlerGuard)
    @SubscribeMessage('joinRoom')
    async handleJoinRoom(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: JoinRoomDto,
    ) {
      const { challengeRoomIdx, userIdx } = data;
      const roomName = `entry-room-${challengeRoomIdx}`;
  
      try {
        client.join(roomName);
        const clientInfo = this.connectedClients.get(client.id);
        if (clientInfo) clientInfo.rooms.add(roomName);
  
        const participants = await this.entryService.getChallengeParticipants(challengeRoomIdx);
        client.emit('participantsList', {
          participants,
          totalCount: participants.length,
          challengeRoomIdx,
        });
  
        if (this.isRedisAvailable) {
          await this.redisPubSub.publish('entry:broadcast', {
            room: roomName,
            event: 'userJoinedRoom',
            payload: { userIdx, nickname: client.data.user.nickname, timestamp: new Date() },
          });
        } else {
          this.server.to(roomName).emit('userJoinedRoom', {
            userIdx,
            nickname: client.data.user.nickname,
            timestamp: new Date(),
          });
        }
  
        this.logger.log(`User ${userIdx} joined entry room ${challengeRoomIdx}`);
      } catch (error) {
        this.logger.error(`Entry join room error: ${error.message}`);
        client.emit('error', { code: 'JOIN_ERROR', message: '룸 참가 중 오류가 발생했습니다.' });
      }
    }
  
    // 2. 도전 참여 이벤트
    @UseGuards(WsJwtGuard, WsThrottlerGuard)
    @SubscribeMessage('participate')
    async handleParticipate(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: ParticipateDto,
    ) {
      const { challengeRoomIdx, userIdx } = data;
      const roomName = `entry-room-${challengeRoomIdx}`;
  
      try {
        const participant = await this.entryService.createParticipant(challengeRoomIdx, userIdx);
        if (!participant) {
          client.emit('error', { code: 'PARTICIPATE_FAILED', message: '도전 참여에 실패했습니다.' });
          return;
        }
  
        const updatedParticipants = await this.entryService.getChallengeParticipants(challengeRoomIdx);
        const broadcastData = {
          participants: updatedParticipants,
          totalCount: updatedParticipants.length,
          challengeRoomIdx,
          newParticipant: {
            userIdx: participant.user.idx,
            nickname: participant.user.nickname,
            profileImageUrl: participant.user.profile?.profile_image_url || null,
            joinedAt: participant.joined_at,
            status: participant.status,
          },
        };
  
        if (this.isRedisAvailable) {
          await this.redisPubSub.publish('entry:broadcast', {
            room: roomName,
            event: 'participantJoined',
            payload: broadcastData,
          });
        } else {
          this.server.to(roomName).emit('participantJoined', broadcastData);
        }
  
        this.logger.log(`User ${userIdx} participated in challenge ${challengeRoomIdx}`);
        client.emit('participateSuccess', {
          message: '도전 참여가 완료되었습니다.',
          participant: {
            userIdx: participant.user.idx,
            nickname: participant.user.nickname,
            profileImageUrl: participant.user.profile?.profile_image_url || null,
            joinedAt: participant.joined_at,
            status: participant.status,
          },
        });
      } catch (error) {
        this.logger.error(`Participate error: ${error.message}`);
        client.emit('error', {
          code: 'PARTICIPATE_ERROR',
          message: error.message || '도전 참여 중 오류가 발생했습니다.',
        });
      }
    }
  
    // 3. 도전 참여 취소 이벤트
    @UseGuards(WsJwtGuard, WsThrottlerGuard)
    @SubscribeMessage('cancelParticipation')
    async handleCancelParticipation(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: CancelParticipationDto,
    ) {
      const { challengeRoomIdx, userIdx } = data;
      const roomName = `entry-room-${challengeRoomIdx}`;
  
      try {
        const result = await this.entryService.removeParticipant(challengeRoomIdx, userIdx);
        if (!result) {
          client.emit('error', { code: 'CANCEL_FAILED', message: '도전 참여 취소에 실패했습니다.' });
          return;
        }
  
        const updatedParticipants = await this.entryService.getChallengeParticipants(challengeRoomIdx);
        const broadcastData = {
          participants: updatedParticipants,
          totalCount: updatedParticipants.length,
          challengeRoomIdx,
          removedParticipant: { userIdx, nickname: client.data.user.nickname },
        };
  
        if (this.isRedisAvailable) {
          await this.redisPubSub.publish('entry:broadcast', {
            room: roomName,
            event: 'participantLeft',
            payload: broadcastData,
          });
        } else {
          this.server.to(roomName).emit('participantLeft', broadcastData);
        }
  
        this.logger.log(`User ${userIdx} left challenge ${challengeRoomIdx}`);
        client.emit('cancelSuccess', { message: '도전 참여가 취소되었습니다.' });
      } catch (error) {
        this.logger.error(`Cancel participation error: ${error.message}`);
        client.emit('error', {
          code: 'CANCEL_ERROR',
          message: '도전 참여 취소 중 오류가 발생했습니다.',
        });
      }
    }
  
    // 4. 참가자 목록 조회
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('getParticipants')
    async handleGetParticipants(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: GetParticipantsDto,
    ) {
      const { challengeRoomIdx } = data;
      try {
        const participants = await this.entryService.getChallengeParticipants(challengeRoomIdx);
        client.emit('participantsList', {
          participants,
          totalCount: participants.length,
          challengeRoomIdx,
        });
      } catch (error) {
        this.logger.error(`Get participants error: ${error.message}`);
        client.emit('error', {
          code: 'GET_PARTICIPANTS_ERROR',
          message: '참가자 목록 조회 중 오류가 발생했습니다.',
        });
      }
    }
  
    // 5. 룸에서 나가기
    @UseGuards(WsJwtGuard)
    @SubscribeMessage('leaveRoom')
    async handleLeaveRoom(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: LeaveRoomDto,
    ) {
      const { challengeRoomIdx, userIdx } = data;
      const roomName = `entry-room-${challengeRoomIdx}`;
  
      try {
        client.leave(roomName);
        const clientInfo = this.connectedClients.get(client.id);
        if (clientInfo) clientInfo.rooms.delete(roomName);
  
        if (this.isRedisAvailable) {
          await this.redisPubSub.publish('entry:broadcast', {
            room: roomName,
            event: 'userLeftRoom',
            payload: { userIdx, nickname: client.data.user.nickname, timestamp: new Date() },
          });
        } else {
          this.server.to(roomName).emit('userLeftRoom', {
            userIdx,
            nickname: client.data.user.nickname,
            timestamp: new Date(),
          });
        }
  
        this.logger.log(`User ${userIdx} left entry room ${challengeRoomIdx}`);
      } catch (error) {
        this.logger.error(`Leave room error: ${error.message}`);
      }
    }
  }