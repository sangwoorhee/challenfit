import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { MailerModule } from '@nestjs-modules/mailer';
import { UserModule } from './common/routes/user/user.module';
import { AuthModule } from './common/routes/auth/auth.module';
import { ChallengeroomModule } from './common/routes/challengeroom/challengeroom.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkoutcertModule } from './common/routes/workoutcert/workoutcert.module';

@Module({
  imports: [
    // 스케쥴러 크론 탭
    ScheduleModule.forRoot(),
    // 환경변수 로딩
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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

     // 이메일 전송 설정
     MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        transport: {
          host: cs.get('MAIL_HOST'),
          port: cs.get<number>('MAIL_PORT'),
          secure: cs.get('MAIL_SECURE') === 'true',
          auth: {
            user: cs.get('MAIL_USER'),
            pass: cs.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: cs.get('MAIL_FROM'),
        },
      }),
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
    ChallengeroomModule,
    WorkoutcertModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
