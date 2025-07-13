// src/common/services/redis-pubsub.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Function[]> = new Map();

  constructor(private configService: ConfigService) {
    const redisOptions = {
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    this.publisher = new Redis(redisOptions);
    this.subscriber = new Redis(redisOptions);

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
        console.error('Error parsing Redis message:', error);
      }
    });
  }

  // 채널 구독
  async subscribe(channel: string, handler: Function): Promise<void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, []);
      await this.subscriber.subscribe(channel);
    }
    
    const handlers = this.handlers.get(channel);
    if (handlers) {
      handlers.push(handler);
    }
  }

  // 채널 구독 해제
  async unsubscribe(channel: string, handler?: Function): Promise<void> {
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
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  // 대량 메시지 발행 (파이프라인 사용)
  async publishBatch(messages: { channel: string; message: any }[]): Promise<void> {
    const pipeline = this.publisher.pipeline();
    
    messages.forEach(({ channel, message }) => {
      pipeline.publish(channel, JSON.stringify(message));
    });
    
    await pipeline.exec();
  }

  onModuleDestroy() {
    this.publisher.disconnect();
    this.subscriber.disconnect();
  }
}