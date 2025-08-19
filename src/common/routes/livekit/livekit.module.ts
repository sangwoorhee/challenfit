import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomServiceClient } from 'livekit-server-sdk';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';
import { ChallengeroomModule } from '../../routes/challengeroom/challengeroom.module';
import { ChallengeparticipantModule } from '../challengeparticipant/challengeparticipant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    forwardRef(() => ChallengeroomModule), 
    forwardRef(() => ChallengeparticipantModule)
  ],
  providers: [
    LivekitService,
    {
      provide: RoomServiceClient,
      useFactory: (cfg: ConfigService) => {
        const host = cfg.get<string>('LIVEKIT_HOST_URL');
        const key = cfg.get<string>('LIVEKIT_API_KEY');
        const sec = cfg.get<string>('LIVEKIT_API_SECRET');
        return new RoomServiceClient(host!, key!, sec!);
      },
      inject: [ConfigService],
    },
  ],
  controllers: [LivekitController],
  exports: [LivekitService],
})
export class LivekitModule {}
