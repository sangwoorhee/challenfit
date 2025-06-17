import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { UserModule } from './common/routes/user/user.module';
import { AuthModule } from './common/routes/auth/auth.module';

@Module({
  imports: [
    // 환경변수 로딩
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Redis 캐시 설정 (경로 : sudo vi /etc/redis/redis.conf)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        const host = cs.get<string>('REDIS_HOST') ?? 'redis';
        const port = cs.get<number>('REDIS_PORT') ?? 6379;
        const pw = cs.get<string>('REDIS_PASSWORD') ?? '';
        /* URL 형식: redis://[:password]@host:port */
        const redisUrl = pw.trim().length
          ? `redis://:${pw}@${host}:${port}`
          : `redis://${host}:${port}`;

        return {
          store: redisStore as any,
          url: redisUrl,
          ttl: 0, // 캐시 만료 직접 제어(서비스 코드에서 ttl 지정)
        };
      },
    }),

    // TypeORM 연결 설정
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // 프로덕션에선 false
      }),
    }),
    // 모듈 임포트
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
