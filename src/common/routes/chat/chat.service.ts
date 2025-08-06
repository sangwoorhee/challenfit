import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { ChatMessage } from 'src/common/entities/chat_message.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { User } from 'src/common/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserProfile } from 'src/common/entities/user_profile.entity';

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
  private readonly logger = new Logger('ChatService');

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ChallengeParticipant)
    private challengeParticipantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // 1. 도전방 채팅 메시지 조회
  // 2. 도전방 채팅 메시지 내보내기
  // 3. 도전방 온라인 사용자 조회
  async checkParticipant(
    userIdx: string,
    challengeRoomIdx: string,
  ): Promise<boolean> {
    const cacheKey = `${this.ROOM_PARTICIPANTS_PREFIX}${challengeRoomIdx}:${userIdx}`;
    let isParticipant = await this.safeGetCache<boolean>(cacheKey);

    if (isParticipant === null || isParticipant === undefined) {
      const participant = await this.challengeParticipantRepository.findOne({
        where: {
          user: { idx: userIdx },
          challenge: { idx: challengeRoomIdx },
        },
      });

      isParticipant = !!participant;
      await this.safeSetCache(cacheKey, isParticipant, this.CACHE_TTL);
    }

    return isParticipant;
  }

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
    let userInfo = await this.safeGetCache(cacheKey);

    if (!userInfo) {
      const user = await this.userRepository.findOne({
        where: { idx: userIdx },
        select: ['idx', 'nickname', 'email'],
      });

      if (user) {
        userInfo = user;
        await this.safeSetCache(cacheKey, userInfo, this.CACHE_TTL);
      }
    }

    return userInfo;
  }

  // 사용자 온라인 상태 업데이트
  async updateUserStatus(
    userIdx: string,
    status: 'online' | 'offline',
  ): Promise<void> {
    const key = `${this.USER_STATUS_PREFIX}${userIdx}`;

    if (status === 'online') {
      await this.safeSetCache(
        key,
        {
          status,
          lastSeen: new Date(),
        },
        this.CACHE_TTL,
      );
    } else {
      await this.safeDelCache(key);
    }
  }

  // 메시지 캐시 무효화 - 모든 관련 캐시 삭제

  // 메시지 저장
  async saveMessage(dto: SaveMessageDto): Promise<any> {
    const { userIdx, challengeRoomIdx, message, messageType, attachmentUrl } =
      dto;
    const chatMessage = this.chatMessageRepository.create({
      message,
      message_type: messageType,
      attachment_url: attachmentUrl,
      sender: { idx: userIdx },
      challenge_room: { idx: challengeRoomIdx },
      is_deleted: false,
    });

    const saved = await this.chatMessageRepository.save(chatMessage);

    // 캐시 무효화 - 모든 관련 캐시 삭제
    await this.invalidateMessageCache(challengeRoomIdx);

    // 발신자 정보와 프로필 정보 포함해서 반환
    const messageWithSender = await this.chatMessageRepository.findOne({
      where: { idx: saved.idx },
      relations: ['sender', 'sender.profile'],
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
          profile: {
            profile_image_url: true,
          },
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
    const cacheKey = `${this.MESSAGE_CACHE_PREFIX}profile:${challengeRoomIdx}:${page}:${limit}:${beforeTimestamp || 'latest'}`;

    // 타입을 명시적으로 선언
    let cached: PaginatedResponse<any> | null = null;

    // 첫 페이지는 캐시 확인 건너뛰고 항상 DB에서 조회
    if (page > 1) {
      cached = await this.safeGetCache<PaginatedResponse<any>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 쿼리 빌더
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'profile')
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
        'profile.profile_image_url',
      ])
      .orderBy('message.created_at', 'ASC')
      .take(limit)
      .skip((page - 1) * limit);

    // 특정 시간 이전 메시지만 조회
    if (beforeTimestamp) {
      queryBuilder.andWhere('message.created_at < :beforeTimestamp', {
        beforeTimestamp: new Date(beforeTimestamp),
      });
    }

    const [messages, total] = await queryBuilder.getManyAndCount();

    const formattedMessages = messages.reverse().map((message) => ({
      idx: message.idx,
      message: message.message,
      messageType: message.message_type,
      attachmentUrl: message.attachment_url,
      isDeleted: false,
      createdAt: message.created_at,
      sender: {
        idx: message.sender.idx,
        nickname: message.sender.nickname,
        profileImageUrl: message.sender.profile?.profile_image_url || null,
      },
    }));

    const result: PaginatedResponse<any> = {
      data: formattedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };

    // 결과 캐싱 (최신 페이지는 짧은 TTL)
    const ttl = page === 1 ? 10 : this.CACHE_TTL; // 첫 페이지는 10초
    await (this.cacheManager as any).set(cacheKey, result, { ttl: ttl });

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
  private async invalidateMessageCache(
    challengeRoomIdx: string,
  ): Promise<void> {
    try {
      // 일반 채팅 캐시와 프로필 포함 캐시 모두 삭제
      const prefixes = [
        `${this.MESSAGE_CACHE_PREFIX}${challengeRoomIdx}:`, // chat:messages:{roomIdx}:
        `${this.MESSAGE_CACHE_PREFIX}profile:${challengeRoomIdx}:`, // chat:messages:profile:{roomIdx}:
      ];

      // 삭제할 캐시 키 로그
      this.logger.debug(
        `Invalidating cache for patterns: ${prefixes.join(', ')}`,
      );

      // 각 프리픽스에 대해 페이지별로 캐시 삭제
      for (const prefix of prefixes) {
        // 페이지 1-20까지 삭제 (더 많은 페이지 고려)
        for (let page = 1; page <= 20; page++) {
          // 다양한 limit 값에 대해서도 삭제
          for (const limit of [20, 50, 100]) {
            const key = `${prefix}${page}:${limit}:latest`;
            await this.safeDelCache(key);
            this.logger.debug(`Deleted cache key: ${key}`);
          }
        }
      }

      this.logger.debug(`Cache invalidated for room ${challengeRoomIdx}`);
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
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

    return messages.map((message) => ({
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

  // 안전한 캐시 get 메소드
  private async safeGetCache<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      return result ?? null; // undefined일 때 null 반환
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}:`, error.message);
      return null;
    }
  }

  // 안전한 캐시 set 메소드
  private async safeSetCache(
    key: string,
    value: any,
    ttl?: number,
  ): Promise<void> {
    try {
      await (this.cacheManager as any).set(key, value, {
        ttl: ttl || this.CACHE_TTL,
      });
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${key}:`, error.message);
    }
  }

  // 안전한 캐시 delete 메소드
  private async safeDelCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for key ${key}:`, error.message);
    }
  }

  // 1. 도전방 채팅 메시지 조회
  // 채팅 내역 조회 (프로필 이미지 포함)
  async getChatHistoryWithProfile(
    challengeRoomIdx: string,
    page: number = 1,
    limit: number = 50,
    beforeTimestamp?: string,
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `${this.MESSAGE_CACHE_PREFIX}profile:${challengeRoomIdx}:${page}:${limit}:${beforeTimestamp || 'latest'}`;

    // 첫 페이지는 캐시 확인 건너뛰고 항상 DB에서 조회
    if (page > 1) {
      const cached = await this.safeGetCache<PaginatedResponse<any>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 쿼리 빌더
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'profile')
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
        'profile.profile_image_url',
      ])
      .orderBy('message.created_at', 'ASC')
      .take(limit)
      .skip((page - 1) * limit);

    // 특정 시간 이전 메시지만 조회
    if (beforeTimestamp) {
      queryBuilder.andWhere('message.created_at < :beforeTimestamp', {
        beforeTimestamp: new Date(beforeTimestamp),
      });
    }

    const [messages, total] = await queryBuilder.getManyAndCount();

    // 응답 형식 변환
    const formattedMessages = messages.reverse().map((message) => ({
      idx: message.idx,
      message: message.message,
      messageType: message.message_type,
      attachmentUrl: message.attachment_url,
      isDeleted: false,
      createdAt: message.created_at,
      sender: {
        idx: message.sender.idx,
        nickname: message.sender.nickname,
        profileImageUrl: message.sender.profile?.profile_image_url || null,
      },
    }));

    const result: PaginatedResponse<any> = {
      data: formattedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };

    // 결과 캐싱 (최신 페이지는 짧은 TTL)
    const ttl = page === 1 ? 10 : this.CACHE_TTL; // 첫 페이지는 10초
    await this.safeSetCache(cacheKey, result, ttl);

    return result;
  }

  // 2. 도전방 채팅 메시지 내보내기
  // 대량 메시지 조회 (프로필 이미지 포함)
  async exportChatHistoryWithProfile(
    challengeRoomIdx: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any[]> {
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'profile')
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

    return messages.map((message) => ({
      idx: message.idx,
      message: message.message,
      messageType: message.message_type,
      attachmentUrl: message.attachment_url,
      isDeleted: false,
      createdAt: message.created_at,
      sender: {
        idx: message.sender.idx,
        nickname: message.sender.nickname,
        profileImageUrl: message.sender.profile?.profile_image_url || null,
      },
    }));
  }

  // 3. 도전방 온라인 사용자 조회
  // 도전방의 온라인 사용자 목록 조회 (프로필 이미지 포함)
  async getRoomOnlineUsersWithProfile(
    challengeRoomIdx: string,
  ): Promise<any[]> {
    const participants = await this.challengeParticipantRepository.find({
      where: { challenge: { idx: challengeRoomIdx } },
      relations: ['user', 'user.profile'],
      select: {
        user: {
          idx: true,
          nickname: true,
          profile: {
            profile_image_url: true,
          },
        },
      },
    });

    const onlineUsers: any[] = [];

    for (const participant of participants) {
      const statusKey = `${this.USER_STATUS_PREFIX}${participant.user.idx}`;
      const status = await this.safeGetCache<UserStatus>(statusKey);

      if (status) {
        onlineUsers.push({
          userIdx: participant.user.idx,
          nickname: participant.user.nickname,
          profileImageUrl: participant.user.profile?.profile_image_url || null,
          status: 'online',
          lastSeen: status.lastSeen,
        });
      }
    }

    return onlineUsers;
  }
}
