import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatMessage } from 'src/common/entities/chat_message.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { User } from 'src/common/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisPubSubService } from 'src/common/services/redis-pubsub.service';
import { WsJwtGuard } from 'src/common/guard/ws-jwt.guard';
import { WsThrottlerGuard } from 'src/common/guard/ws-throttler.guard';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessage, 
      ChallengeParticipant, 
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
  controllers: [ChatController],
  providers: [
    ChatGateway,
    ChatService,
    RedisPubSubService,
    WsJwtGuard,
    WsThrottlerGuard,
  ],
  exports: [ChatService, RedisPubSubService],
})
export class ChatModule {}