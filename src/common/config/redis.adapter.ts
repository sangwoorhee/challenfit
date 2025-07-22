// src/common/config/redis.adapter.ts
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private logger = new Logger('RedisIoAdapter');

  constructor(
    app: INestApplication,
    private configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    
    const redisUrl = password 
      ? `redis://:${password}@${host}:${port}`
      : `redis://${host}:${port}`;

      const pubClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Retry attempts exhausted');
              return new Error('Retry attempts exhausted');
            }
            if (retries * 100 > 1000 * 60 * 60) {
              this.logger.error('Retry time exhausted');
              return new Error('Retry time exhausted');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });
    
    const subClient = pubClient.duplicate();

    // 연결 오류 핸들링 추가
    pubClient.on('error', (err) => {
      this.logger.error('Redis Pub Client Error:', err);
    });
    
    subClient.on('error', (err) => {
      this.logger.error('Redis Sub Client Error:', err);
    });

    pubClient.on('connect', () => {
      this.logger.log('Redis Pub Client connected');
    });
    
    subClient.on('connect', () => {
      this.logger.log('Redis Sub Client connected');
    });

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Redis adapter created successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  static async create(app: INestApplication): Promise<RedisIoAdapter> {
    const configService = app.get(ConfigService);
    const adapter = new RedisIoAdapter(app, configService);
    await adapter.connectToRedis();
    return adapter;
  }
}