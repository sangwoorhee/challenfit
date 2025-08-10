import { Inject, Injectable, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Socket } from 'socket.io';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class WsThrottlerGuard {
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly WINDOW_SIZE = 60; // 60초

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRedis() private readonly redisClient: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const userIdx = client.data.user?.idx || client.id;
    const event = context.switchToWs().getData();

    const key = `rate_limit:${userIdx}:${event.constructor.name}`;
    const current = parseInt((await this.redisClient.get(key)) || '0', 10);

    const ttl = await this.redisClient.ttl(key);
    console.log(`current=${current}, ttl=${ttl}`);

    if (current >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new WsException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      });
    }

    await this.redisClient.set(key, current + 1, 'EX', this.WINDOW_SIZE);
    return true;
  }
}
