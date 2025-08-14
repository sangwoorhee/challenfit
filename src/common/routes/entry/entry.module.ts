// challenfit_backend>src>common>routes>entry>entry.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntryGateway } from './entry.gateway';
import { EntryService } from './entry.service';
import { EntryController } from './entry.controller';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisPubSubService } from 'src/common/services/redis-pubsub.service';
import { WsJwtGuard } from 'src/common/guard/ws-jwt.guard';
import { WsThrottlerGuard } from 'src/common/guard/ws-throttler.guard';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChallengeParticipant,
      ChallengeRoom,
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
    ChatModule, // ChatService를 사용하기 위해 ChatModule import
  ],
  controllers: [EntryController],
  providers: [
    RedisModule,
    EntryGateway,
    EntryService,
    RedisPubSubService,
    WsJwtGuard,
    WsThrottlerGuard,
  ],
  exports: [EntryService, RedisModule],
})
export class EntryModule {}
