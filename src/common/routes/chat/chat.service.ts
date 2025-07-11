// src/common/routes/chat/chat.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { ChatMessage } from 'src/common/entities/chat_message.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { User } from 'src/common/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface SaveMessageDto {
  userIdx: string;
  challengeRoomIdx: string;
  message: string;
  messageType: string;
  attachmentUrl?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface UserStatus {
  status: string;
  lastSeen: Date;
}

interface OnlineUser {
  userIdx: string;
  nickname: string;
  status: string;
  lastSeen: Date;
}

@Injectable()
export class ChatService {
  private readonly CACHE_TTL = 3600; // 1시간
  private readonly MESSAGE_CACHE_PREFIX = 'chat:messages:';
  private readonly USER_STATUS_PREFIX = 'user:status:';
  private readonly ROOM_PARTICIPANTS_PREFIX = 'room:participants:';

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ChallengeParticipant)
    private challengeParticipantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // JWT 토큰 검증
  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      
      // 사용자 정보 캐싱
      const userInfo = await this.getUserInfo(payload.sub);
      return userInfo;
    } catch {
      return null;
    }
  }

  // 사용자 정보 조회 (캐싱)
  async getUserInfo(userIdx: string): Promise<any> {
    const cacheKey = `user:info:${userIdx}`;
    let userInfo = await this.cacheManager.get(cacheKey);
    
    if (!userInfo) {
      const user = await this.userRepository.findOne({
        where: { idx: userIdx },
        select: ['idx', 'nickname', 'email'],
      });
      
      if (user) {
        userInfo = user;
        await this.cacheManager.set(cacheKey, userInfo, this.CACHE_TTL);
      }
    }
    
    return userInfo;
  }

  // 사용자 온라인 상태 업데이트
  async updateUserStatus(userIdx: string, status: 'online' | 'offline'): Promise<void> {
    const key = `${this.USER_STATUS_PREFIX}${userIdx}`;
    
    if (status === 'online') {
      await this.cacheManager.set(key, {
        status,
        lastSeen: new Date(),
      }, this.CACHE_TTL);
    } else {
      await this.cacheManager.del(key);
    }
  }

  // 도전방 참가자 확인 (캐싱)
  async checkParticipant(
    userIdx: string,
    challengeRoomIdx: string,
  ): Promise<boolean> {
    const cacheKey = `${this.ROOM_PARTICIPANTS_PREFIX}${challengeRoomIdx}:${userIdx}`;
    let isParticipant = await this.cacheManager.get<boolean>(cacheKey);
    
    if (isParticipant === null || isParticipant === undefined) {
      const participant = await this.challengeParticipantRepository.findOne({
        where: {
          user: { idx: userIdx },
          challenge: { idx: challengeRoomIdx },
        },
      });
      
      isParticipant = !!participant;
      await this.cacheManager.set(cacheKey, isParticipant, this.CACHE_TTL);
    }
    
    return isParticipant;
  }

  // 메시지 저장
  async saveMessage(dto: SaveMessageDto): Promise<any> {
    const { userIdx, challengeRoomIdx, message, messageType, attachmentUrl } = dto;
    
    const chatMessage = this.chatMessageRepository.create({
      message,
      message_type: messageType,
      attachment_url: attachmentUrl,
      sender: { idx: userIdx },
      challenge_room: { idx: challengeRoomIdx },
    });

    const saved = await this.chatMessageRepository.save(chatMessage);
    
    // 캐시 무효화
    await this.invalidateMessageCache(challengeRoomIdx);
    
    // 발신자 정보 포함해서 반환
    const messageWithSender = await this.chatMessageRepository.findOne({
      where: { idx: saved.idx },
      relations: ['sender'],
      select: {
        idx: true,
        message: true,
        message_type: true,
        attachment_url: true,
        created_at: true,
        is_deleted: true,
        sender: {
          idx: true,
          nickname: true,
        },
      },
    });
    
    return messageWithSender;
  }

  // 채팅 내역 조회 (페이지네이션 + 캐싱)
  async getChatHistory(
    challengeRoomIdx: string,
    page: number = 1,
    limit: number = 50,
    beforeTimestamp?: string,
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `${this.MESSAGE_CACHE_PREFIX}${challengeRoomIdx}:${page}:${limit}:${beforeTimestamp || 'latest'}`;
    
    // 캐시 확인
    const cached = await this.cacheManager.get<PaginatedResponse<any>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // 쿼리 빌더
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.challenge_room = :challengeRoomIdx', { challengeRoomIdx })
      .andWhere('message.is_deleted = :isDeleted', { isDeleted: false })
      .select([
        'message.idx',
        'message.message',
        'message.message_type',
        'message.attachment_url',
        'message.created_at',
        'sender.idx',
        'sender.nickname',
      ])
      .orderBy('message.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);
    
    // 특정 시간 이전 메시지만 조회
    if (beforeTimestamp) {
      queryBuilder.andWhere('message.created_at < :beforeTimestamp', {
        beforeTimestamp: new Date(beforeTimestamp),
      });
    }
    
    const [messages, total] = await queryBuilder.getManyAndCount();
    
    const result: PaginatedResponse<any> = {
      data: messages.reverse(), // 시간순으로 정렬
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
    
    // 결과 캐싱 (최신 페이지는 짧은 TTL)
    const ttl = page === 1 ? 60 : this.CACHE_TTL; // 첫 페이지는 1분
    await this.cacheManager.set(cacheKey, result, ttl);
    
    return result;
  }

  // 메시지 삭제 (소프트 삭제)
  async deleteMessage(messageIdx: string, userIdx: string): Promise<any> {
    const message = await this.chatMessageRepository.findOne({
      where: { idx: messageIdx },
      relations: ['sender', 'challenge_room'],
    });
    
    if (!message || message.sender.idx !== userIdx) {
      return null;
    }
    
    message.is_deleted = true;
    await this.chatMessageRepository.save(message);
    
    // 캐시 무효화
    await this.invalidateMessageCache(message.challenge_room.idx);
    
    return message;
  }

  // 룸의 온라인 사용자 목록 조회
  async getRoomOnlineUsers(challengeRoomIdx: string): Promise<OnlineUser[]> {
    const participants = await this.challengeParticipantRepository.find({
      where: { challenge: { idx: challengeRoomIdx } },
      relations: ['user'],
      select: {
        user: {
          idx: true,
          nickname: true,
        },
      },
    });
    
    const onlineUsers: OnlineUser[] = [];
    
    for (const participant of participants) {
      const statusKey = `${this.USER_STATUS_PREFIX}${participant.user.idx}`;
      const status = await this.cacheManager.get<UserStatus>(statusKey);
      
      if (status) {
        onlineUsers.push({
          userIdx: participant.user.idx,
          nickname: participant.user.nickname,
          status: 'online',
          lastSeen: status.lastSeen,
        });
      }
    }
    
    return onlineUsers;
  }

  // 푸시 알림 발송 (비동기)
  async sendPushNotifications(
    challengeRoomIdx: string,
    senderIdx: string,
    message: string,
  ): Promise<void> {
    try {
      // 도전방 참가자 중 오프라인 사용자 조회
      const participants = await this.challengeParticipantRepository.find({
        where: { 
          challenge: { idx: challengeRoomIdx },
          user: { idx: Not(senderIdx) }, // 발신자 제외
        },
        relations: ['user'],
      });
      
      const sender = await this.getUserInfo(senderIdx);
      
      for (const participant of participants) {
        const statusKey = `${this.USER_STATUS_PREFIX}${participant.user.idx}`;
        const status = await this.cacheManager.get(statusKey);
        
        // 오프라인 사용자에게만 푸시 알림
        if (!status) {
          // 푸시 알림 큐에 추가 (실제 구현 시 FCM/APNs 사용)
          await this.queuePushNotification({
            userIdx: participant.user.idx,
            title: `${sender.nickname}님의 새 메시지`,
            body: message.substring(0, 100),
            data: {
              type: 'chat',
              challengeRoomIdx,
              senderIdx,
            },
          });
        }
      }
    } catch (error) {
      // 푸시 알림 실패는 채팅 기능에 영향을 주지 않도록 처리
      console.error('Push notification error:', error);
    }
  }

  // 푸시 알림 큐 추가 (실제 구현 필요)
  private async queuePushNotification(notification: any): Promise<void> {
    // Redis 큐 또는 메시지 큐 서비스 사용
    // 예: Bull Queue, AWS SQS 등
  }

  // 메시지 캐시 무효화
  private async invalidateMessageCache(challengeRoomIdx: string): Promise<void> {
    const pattern = `${this.MESSAGE_CACHE_PREFIX}${challengeRoomIdx}:*`;
    // cache-manager v5에서는 keys 메서드가 없으므로 다른 방식 사용
    // 실제로는 Redis 클라이언트를 직접 사용하거나 패턴 매칭을 지원하는 캐시 라이브러리 사용
    try {
      // 간단한 구현: 페이지별로 캐시 삭제 (1-10 페이지)
      for (let i = 1; i <= 10; i++) {
        await this.cacheManager.del(`${this.MESSAGE_CACHE_PREFIX}${challengeRoomIdx}:${i}:50:latest`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // 대량 메시지 조회 (export 등을 위한)
  async exportChatHistory(
    challengeRoomIdx: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.challenge_room = :challengeRoomIdx', { challengeRoomIdx })
      .andWhere('message.is_deleted = :isDeleted', { isDeleted: false })
      .orderBy('message.created_at', 'ASC');
    
    if (startDate) {
      queryBuilder.andWhere('message.created_at >= :startDate', { startDate });
    }
    
    if (endDate) {
      queryBuilder.andWhere('message.created_at <= :endDate', { endDate });
    }
    
    const messages = await queryBuilder.getMany();
    
    return messages.map(message => ({
      idx: message.idx,
      message: message.message,
      messageType: message.message_type,
      attachmentUrl: message.attachment_url,
      createdAt: message.created_at,
      sender: {
        idx: message.sender.idx,
        nickname: message.sender.nickname,
      },
    }));
  }
}