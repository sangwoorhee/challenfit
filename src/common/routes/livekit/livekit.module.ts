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
        // 🔄 Blue/Green 환경에 따라 동적으로 HOST URL 선택
        const environment = cfg.get<string>('LIVEKIT_ENVIRONMENT');
        let hostUrl: string;
        
        if (environment === 'blue') {
          hostUrl = cfg.get<string>('LIVEKIT_HOST_URL_BLUE') || 'http://43.200.3.200:7880';
        } else if (environment === 'green') {
          hostUrl = cfg.get<string>('LIVEKIT_HOST_URL_GREEN') || 'http://43.200.3.200:7882';
        } else {
          // 기본값: Blue
          hostUrl = cfg.get<string>('LIVEKIT_HOST_URL_BLUE') || 'http://43.200.3.200:7880';
        }
        
        const key = cfg.get<string>('LIVEKIT_API_KEY');
        const sec = cfg.get<string>('LIVEKIT_API_SECRET');
        
        console.log(`[LiveKit Module] Environment: ${environment}, Host URL: ${hostUrl}`);
        return new RoomServiceClient(hostUrl, key!, sec!);
      },
      inject: [ConfigService],
    },
  ],
  controllers: [LivekitController],
  exports: [LivekitService],
})
export class LivekitModule {}
