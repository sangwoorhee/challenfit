import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomServiceClient } from 'livekit-server-sdk';
import { LivekitService } from './livekit.service';
import { LivekitController } from './livekit.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
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
