import { Injectable, ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class WsThrottlerGuard {
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly WINDOW_SIZE = 60; // 60초

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const userIdx = client.data.user?.idx || client.id;
    const event = context.switchToWs().getData();
    
    // 이벤트별 레이트 리미트 키
    const key = `rate_limit:${userIdx}:${event.constructor.name}`;
    
    const current = await this.cacheManager.get<number>(key) || 0;
    
    if (current >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new WsException({
        code: 'RATE_LIMIT_EXCEEDED',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    
    await this.cacheManager.set(
      key,
      current + 1,
      this.WINDOW_SIZE,
    );
    
    return true;
  }
}