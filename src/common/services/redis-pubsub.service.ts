// src/common/services/redis-pubsub.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Function[]> = new Map();
  private logger = new Logger('RedisPubSubService');
  private isConnected = false;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');

    const redisOptions = {
      host,
      port,
      ...(password && { password }),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    this.publisher = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);

    // 연결 이벤트 핸들러
    this.publisher.on('connect', () => {
      this.logger.log('Publisher connected to Redis');
      this.isConnected = true;
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Subscriber connected to Redis');
    });

    this.publisher.on('error', (err) => {
      this.logger.error('Publisher Redis error:', err.message);
      this.isConnected = false;
    });

    this.subscriber.on('error', (err) => {
      this.logger.error('Subscriber Redis error:', err.message);
      this.isConnected = false;
    });

    // 메시지 수신 처리
    this.subscriber.on('message', (channel: string, message: string) => {
      const handlers = this.handlers.get(channel);
      if (!handlers || handlers.length === 0) {
        return;
      }
      
      try {
        const parsedMessage = JSON.parse(message);
        handlers.forEach(handler => {
          handler(parsedMessage);
        });
      } catch (error) {
        this.logger.error('Error parsing Redis message:', error);
      }
    });
  }

  // 채널 구독
  async subscribe(channel: string, handler: Function): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected. Skipping subscription.');
      return;
    }

    try {
      if (!this.handlers.has(channel)) {
        this.handlers.set(channel, []);
        await this.subscriber.subscribe(channel);
      }
      
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.push(handler);
      }
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
    }
  }

  // 채널 구독 해제
  async unsubscribe(channel: string, handler?: Function): Promise<void> {
    if (!this.isConnected) return;

    const handlers = this.handlers.get(channel);
    if (!handlers) return;

    if (handler) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }

      if (handlers.length === 0) {
        this.handlers.delete(channel);
        await this.subscriber.unsubscribe(channel);
      }
    } else {
      this.handlers.delete(channel);
      await this.subscriber.unsubscribe(channel);
    }
  }

  // 메시지 발행
  async publish(channel: string, message: any): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected. Message not published.');
      return;
    }

    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Failed to publish message to channel ${channel}:`, error);
    }
  }

  // 대량 메시지 발행 (파이프라인 사용)
  async publishBatch(messages: { channel: string; message: any }[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected. Batch not published.');
      return;
    }

    try {
      const pipeline = this.publisher.pipeline();
      
      messages.forEach(({ channel, message }) => {
        pipeline.publish(channel, JSON.stringify(message));
      });
      
      await pipeline.exec();
    } catch (error) {
      this.logger.error('Failed to publish batch:', error);
    }
  }

  onModuleDestroy() {
    if (this.publisher) {
      this.publisher.disconnect();
    }
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }
}