import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { ChallengeScheduler } from './common/routes/challengeroom/challengeroom.scheduler';
import { ChallengeparticipantModule } from './common/routes/challengeparticipant/challengeparticipant.module';
import { CommentModule } from './common/routes/comment/comment.module';
import { LikeModule } from './common/routes/like/like.module';
import { WorkoutcertModule } from './common/routes/workoutcert/workoutcert.module';
import { WorkoutcertapprovalModule } from './common/routes/workoutcertapproval/workoutcertapproval.module';
import { ChatModule } from './common/routes/chat/chat.module';
import { FollowModule } from './common/routes/follow/follow.module';
import { HealthModule } from './common/routes/health/health.module';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { User } from './common/entities/user.entity';
import { RefreshToken } from './common/entities/refresh_token.entity';
import { EntryModule } from './common/routes/entry/entry.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RankingModule } from './common/routes/ranking/ranking.module';
import { LivekitModule } from './common/routes/livekit/livekit.module';
import { PrivateChatModule } from './common/routes/private-chat/private-chat.module';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
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
        synchronize: false, // 프로덕션에선 false
      }),
    }),
    // TypeORM 연결 설정
    TypeOrmModule.forFeature([User, RefreshToken]),
    // 모듈 임포트
    AuthModule,
    UserModule,
    ChallengeroomModule,
    ChallengeparticipantModule,
    CommentModule,
    LikeModule,
    WorkoutcertModule,
    WorkoutcertapprovalModule,
    FollowModule,
    ChatModule,
    HealthModule,
    EntryModule,
    RankingModule,
    LivekitModule,
    PrivateChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // JWT 미들웨어를 모든 경로에 적용
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}
