// src/common/config/redis.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplication } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379', //'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });
    
    const subClient = pubClient.duplicate();

    // 연결 오류 핸들링 추가
    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
    subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  static async create(app: INestApplication): Promise<RedisIoAdapter> {
    const adapter = new RedisIoAdapter(app);
    await adapter.connectToRedis();
    return adapter;
  }
}