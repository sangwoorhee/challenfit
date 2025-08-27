import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateChatGateway } from './private-chat.gateway';
import { PrivateChatService } from './private-chat.service';
import { PrivateChatController } from './private-chat.controller';
import { PrivateChatRoom } from 'src/common/entities/private_chat_room.entity';
import { PrivateChatMessage } from 'src/common/entities/private_chat_message.entity';
import { PrivateChatMessageRead } from 'src/common/entities/private_chat_message_read.entity';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisPubSubService } from 'src/common/services/redis-pubsub.service';
import { WsJwtGuard } from 'src/common/guard/ws-jwt.guard';
import { WsThrottlerGuard } from 'src/common/guard/ws-throttler.guard';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    TypeOrmModule.forFeature([
      PrivateChatRoom,
      PrivateChatMessage,
      PrivateChatMessageRead,
      User,
      UserProfile,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [PrivateChatController],
  providers: [
    PrivateChatGateway,
    PrivateChatService,
    RedisPubSubService,
    WsJwtGuard,
    WsThrottlerGuard,
  ],
  exports: [PrivateChatService, RedisPubSubService],
})
export class PrivateChatModule {}
