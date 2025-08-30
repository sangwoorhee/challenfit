import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PrivateChatRoom } from 'src/common/entities/private_chat_room.entity';
import { PrivateChatMessage } from 'src/common/entities/private_chat_message.entity';
import { PrivateChatMessageRead } from 'src/common/entities/private_chat_message_read.entity';
import { User } from 'src/common/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatMessageType } from 'src/common/enum/enum';

interface SendPrivateMessageDto {
  senderIdx: string;
  chatRoomIdx: string;
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

@Injectable()
export class PrivateChatService {
  private readonly CACHE_TTL = 3600; // 1시간
  private readonly MESSAGE_CACHE_PREFIX = 'private_chat:messages:';
  private readonly ROOM_CACHE_PREFIX = 'private_chat:rooms:';
  private readonly logger = new Logger('PrivateChatService');

  constructor(
    @InjectRepository(PrivateChatRoom)
    private privateChatRoomRepository: Repository<PrivateChatRoom>,
    @InjectRepository(PrivateChatMessage)
    private privateChatMessageRepository: Repository<PrivateChatMessage>,
    @InjectRepository(PrivateChatMessageRead)
    private privateChatMessageReadRepository: Repository<PrivateChatMessageRead>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  // JWT 토큰 검증
  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

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
        relations: ['profile'],
        select: {
          idx: true,
          nickname: true,
          email: true,
          profile: {
            profile_image_url: true,
          },
        },
      });

      if (user) {
        userInfo = {
          idx: user.idx,
          nickname: user.nickname,
          email: user.email,
          profileImageUrl: user.profile?.profile_image_url || null,
        };
        await this.safeSetCache(cacheKey, userInfo, this.CACHE_TTL);
      }
    }

    return userInfo;
  }

  // 일대일 채팅방 생성 또는 조회
  async createOrGetPrivateChatRoom(
    user1Idx: string,
    user2Idx: string,
  ): Promise<{ chatRoom: any; isNewRoom: boolean }> {
    if (user1Idx === user2Idx) {
      throw new BadRequestException('자기 자신과는 채팅할 수 없습니다.');
    }

    // 순서 정규화 (작은 idx가 user1이 되도록)
    const [userA, userB] = [user1Idx, user2Idx].sort();

    // 기존 채팅방 조회
    let chatRoom = await this.privateChatRoomRepository.findOne({
      where: [{ user1: { idx: userA }, user2: { idx: userB } }],
      relations: ['user1', 'user1.profile', 'user2', 'user2.profile'],
    });

    let isNewRoom = false;

    if (!chatRoom) {
      // 새 채팅방 생성
      const user1 = await this.userRepository.findOne({
        where: { idx: userA },
      });
      const user2 = await this.userRepository.findOne({
        where: { idx: userB },
      });

      if (!user1 || !user2) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      chatRoom = this.privateChatRoomRepository.create({
        user1: { idx: userA },
        user2: { idx: userB },
        user1_deleted: false,
        user2_deleted: false,
      });

      chatRoom = await this.privateChatRoomRepository.save(chatRoom);

      // 관계 다시 로드
      const reloadedChatRoom = await this.privateChatRoomRepository.findOne({
        where: { idx: chatRoom.idx },
        relations: ['user1', 'user1.profile', 'user2', 'user2.profile'],
      });

      if (!reloadedChatRoom) {
        throw new Error('채팅방을 다시 로드하는데 실패했습니다.');
      }

      chatRoom = reloadedChatRoom;
      isNewRoom = true;
    }

    // 응답 형식 변환
    const currentUserIdx = user1Idx;
    const participant =
      chatRoom.user1.idx === currentUserIdx ? chatRoom.user2 : chatRoom.user1;

    const formattedChatRoom = {
      idx: chatRoom.idx,
      participant: {
        idx: participant.idx,
        nickname: participant.nickname,
        profileImageUrl: participant.profile?.profile_image_url || null,
      },
      lastMessage: chatRoom.last_message,
      lastMessageAt: chatRoom.last_message_at,
      unreadCount: 0, // 새 방이므로 0
      createdAt: chatRoom.created_at,
    };

    return { chatRoom: formattedChatRoom, isNewRoom };
  }

  // 사용자의 채팅방 목록 조회
  async getPrivateChatRooms(
    userIdx: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `${this.ROOM_CACHE_PREFIX}${userIdx}:${page}:${limit}`;

    // 첫 페이지는 캐시 확인 건너뛰고 항상 DB에서 조회
    if (page > 1) {
      const cached = await this.safeGetCache<PaginatedResponse<any>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const queryBuilder = this.privateChatRoomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.user1', 'user1')
      .leftJoinAndSelect('room.user2', 'user2')
      .leftJoinAndSelect('user1.profile', 'user1Profile')
      .leftJoinAndSelect('user2.profile', 'user2Profile')
      .where('(room.user1 = :userIdx OR room.user2 = :userIdx)', { userIdx })
      .andWhere(
        '((room.user1 = :userIdx AND room.user1_deleted = false) OR (room.user2 = :userIdx AND room.user2_deleted = false))',
        { userIdx },
      )
      .orderBy('room.last_message_at', 'DESC')
      .addOrderBy('room.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [chatRooms, total] = await queryBuilder.getManyAndCount();

    // 읽지 않은 메시지 수 계산
    const formattedChatRooms = await Promise.all(
      chatRooms.map(async (room) => {
        const participant =
          room.user1.idx === userIdx ? room.user2 : room.user1;

        // 읽지 않은 메시지 수 계산
        const unreadCount = await this.getUnreadMessageCount(room.idx, userIdx);

        return {
          idx: room.idx,
          participant: {
            idx: participant.idx,
            nickname: participant.nickname,
            profileImageUrl: participant.profile?.profile_image_url || null,
          },
          lastMessage: room.last_message,
          lastMessageAt: room.last_message_at,
          unreadCount,
          createdAt: room.created_at,
        };
      }),
    );

    const result: PaginatedResponse<any> = {
      data: formattedChatRooms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };

    // 결과 캐싱 (최신 페이지는 짧은 TTL)
    const ttl = page === 1 ? 10 : this.CACHE_TTL;
    await this.safeSetCache(cacheKey, result, ttl);

    return result;
  }

  // 채팅방의 메시지 목록 조회
  async getPrivateMessages(
    chatRoomIdx: string,
    userIdx: string,
    page: number = 1,
    limit: number = 50,
    beforeTimestamp?: string,
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `${this.MESSAGE_CACHE_PREFIX}${chatRoomIdx}:${userIdx}:${page}:${limit}:${beforeTimestamp || 'latest'}`;

    // 첫 페이지는 캐시 확인 건너뛰고 항상 DB에서 조회
    if (page > 1) {
      const cached = await this.safeGetCache<PaginatedResponse<any>>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 채팅방 접근 권한 확인
    const hasAccess = await this.checkChatRoomAccess(chatRoomIdx, userIdx);
    if (!hasAccess) {
      throw new BadRequestException('채팅방에 접근할 수 없습니다.');
    }

    const queryBuilder = this.privateChatMessageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('sender.profile', 'profile')
      .where('message.chat_room = :chatRoomIdx', { chatRoomIdx })
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
      ]);

    // 특정 시간 이전 메시지만 조회
    if (beforeTimestamp) {
      queryBuilder.andWhere('message.created_at < :beforeTimestamp', {
        beforeTimestamp: new Date(beforeTimestamp),
      });
    }

    queryBuilder
      .orderBy('message.created_at', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [messages, total] = await queryBuilder.getManyAndCount();

    // 읽음 상태 조회
    const messageIds = messages.map((msg) => msg.idx);

    const readStatus = await this.getMessageReadStatus(messageIds, userIdx);

    // 응답 형식 변환
    const formattedMessages = messages.reverse().map((message) => ({
      idx: message.idx,
      message: message.message,
      messageType: message.message_type,
      attachmentUrl: message.attachment_url,
      isDeleted: false,
      isMine: message.sender.idx === userIdx,
      isRead: readStatus[message.idx] || false,
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

    // 결과 캐싱
    const ttl = page === 1 ? 10 : this.CACHE_TTL;
    await this.safeSetCache(cacheKey, result, ttl);

    return result;
  }

  // 메시지 전송
  async sendPrivateMessage(dto: SendPrivateMessageDto): Promise<any> {
    const { senderIdx, chatRoomIdx, message, messageType, attachmentUrl } = dto;

    // 채팅방 접근 권한 확인
    const hasAccess = await this.checkChatRoomAccess(chatRoomIdx, senderIdx);
    if (!hasAccess) {
      throw new BadRequestException('채팅방에 접근할 수 없습니다.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 메시지 저장
      const chatMessage = this.privateChatMessageRepository.create({
        message,
        message_type: messageType as ChatMessageType,
        attachment_url: attachmentUrl,
        sender: { idx: senderIdx },
        chat_room: { idx: chatRoomIdx },
        is_deleted: false,
      });

      const savedMessage = await queryRunner.manager.save(chatMessage);

      // 채팅방 마지막 메시지 정보 업데이트
      await queryRunner.manager.update(
        PrivateChatRoom,
        { idx: chatRoomIdx },
        {
          last_message: message,
          last_message_at: savedMessage.created_at,
        },
      );

      await queryRunner.commitTransaction();

      // 캐시 무효화
      await this.invalidateMessageCache(chatRoomIdx);

      // 발신자 정보와 프로필 정보 포함해서 반환
      const messageWithSender = await this.privateChatMessageRepository.findOne(
        {
          where: { idx: savedMessage.idx },
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
        },
      );

      return messageWithSender;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 메시지 읽음 처리
  async markMessageAsRead(messageIdx: string, userIdx: string): Promise<void> {
    // 이미 읽음 처리된 메시지인지 확인
    const existingRead = await this.privateChatMessageReadRepository.findOne({
      where: {
        message: { idx: messageIdx },
        user: { idx: userIdx },
      },
    });

    if (!existingRead) {
      // 읽음 처리
      const messageRead = this.privateChatMessageReadRepository.create({
        message: { idx: messageIdx },
        user: { idx: userIdx },
      });

      await this.privateChatMessageReadRepository.save(messageRead);
    }
  }

  // 채팅방 메시지들 일괄 읽음 처리
  async markChatRoomMessagesAsRead(
    chatRoomIdx: string,
    userIdx: string,
  ): Promise<void> {
    // 읽지 않은 메시지들 조회
    const unreadMessages = await this.privateChatMessageRepository
      .createQueryBuilder('message')
      .leftJoin('message.reads', 'read', 'read.user = :userIdx', { userIdx })
      .where('message.chat_room = :chatRoomIdx', { chatRoomIdx })
      .andWhere('message.sender != :userIdx', { userIdx }) // 자신이 보낸 메시지 제외
      .andWhere('read.idx IS NULL') // 읽지 않은 메시지만
      .andWhere('message.is_deleted = false')
      .getMany();

    if (unreadMessages.length > 0) {
      const messageReads = unreadMessages.map((message) =>
        this.privateChatMessageReadRepository.create({
          message: { idx: message.idx },
          user: { idx: userIdx },
        }),
      );

      await this.privateChatMessageReadRepository.save(messageReads);
    }
  }

  // 메시지 삭제 (소프트 삭제)
  async deletePrivateMessage(
    messageIdx: string,
    userIdx: string,
  ): Promise<any> {
    const message = await this.privateChatMessageRepository.findOne({
      where: { idx: messageIdx },
      relations: ['sender', 'chat_room'],
    });

    if (!message || message.sender.idx !== userIdx) {
      return null;
    }

    message.is_deleted = true;
    await this.privateChatMessageRepository.save(message);

    // 캐시 무효화
    await this.invalidateMessageCache(message.chat_room.idx);

    return message;
  }

  // 채팅방 접근 권한 확인
  private async checkChatRoomAccess(
    chatRoomIdx: string,
    userIdx: string,
  ): Promise<boolean> {
    const chatRoom = await this.privateChatRoomRepository.findOne({
      where: { idx: chatRoomIdx },
      relations: ['user1', 'user2'],
    });

    if (!chatRoom) {
      return false;
    }

    const isUser1 = chatRoom.user1.idx === userIdx;
    const isUser2 = chatRoom.user2.idx === userIdx;

    if (!isUser1 && !isUser2) {
      return false;
    }

    // 삭제된 채팅방인지 확인
    if (isUser1 && chatRoom.user1_deleted) {
      return false;
    }
    if (isUser2 && chatRoom.user2_deleted) {
      return false;
    }

    return true;
  }

  // 읽지 않은 메시지 수 계산
  private async getUnreadMessageCount(
    chatRoomIdx: string,
    userIdx: string,
  ): Promise<number> {
    return await this.privateChatMessageRepository
      .createQueryBuilder('message')
      .leftJoin('message.reads', 'read', 'read.user = :userIdx', { userIdx })
      .where('message.chat_room = :chatRoomIdx', { chatRoomIdx })
      .andWhere('message.sender != :userIdx', { userIdx }) // 자신이 보낸 메시지 제외
      .andWhere('read.idx IS NULL') // 읽지 않은 메시지만
      .andWhere('message.is_deleted = false')
      .getCount();
  }

  // 메시지들의 읽음 상태 조회
  private async getMessageReadStatus(
    messageIds: string[],
    userIdx: string,
  ): Promise<Record<string, boolean>> {
    if (!messageIds?.length) return {};

    // 중복/빈값 제거 (선택)
    const ids = Array.from(new Set(messageIds.filter(Boolean)));

    const reads = await this.privateChatMessageReadRepository.find({
      where: {
        message: { idx: In(ids) }, // ✅ 핵심
        user: { idx: userIdx },
      },
      relations: { message: true }, // 문자열 배열보다 객체 표기를 권장
    });

    const readStatus: Record<string, boolean> = {};
    for (const r of reads) {
      if (r.message?.idx) readStatus[r.message.idx] = true;
    }
    return readStatus;
  }

  // 메시지 캐시 무효화
  private async invalidateMessageCache(chatRoomIdx: string): Promise<void> {
    try {
      const patterns = [
        `${this.MESSAGE_CACHE_PREFIX}${chatRoomIdx}:`,
        `${this.ROOM_CACHE_PREFIX}`,
      ];

      this.logger.debug(
        `Invalidating cache for patterns: ${patterns.join(', ')}`,
      );

      // 각 패턴에 대해 캐시 삭제
      for (const pattern of patterns) {
        for (let page = 1; page <= 20; page++) {
          for (const limit of [20, 50, 100]) {
            const key = `${pattern}${page}:${limit}:latest`;
            await this.safeDelCache(key);
          }
        }
      }

      this.logger.debug(`Cache invalidated for chat room ${chatRoomIdx}`);
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
    }
  }

  // 안전한 캐시 메소드들
  private async safeGetCache<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      return result ?? null;
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}:`, error.message);
      return null;
    }
  }

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

  private async safeDelCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for key ${key}:`, error.message);
    }
  }
}
