import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessToken,
  RoomServiceClient,
  type VideoGrant,
} from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly rooms: RoomServiceClient,
  ) {}

  async issueToken(params: {
    roomName: string;
    identity: string;
    name?: string;
    ttlSec?: number;
    canPublish?: boolean;
    canSubscribe?: boolean;
  }) {
    const {
      roomName,
      identity,
      name,
      ttlSec = 600,
      canPublish = true,
      canSubscribe = true,
    } = params;

    const apiKey = this.cfg.get<string>('LIVEKIT_API_KEY')!;
    const apiSec = this.cfg.get<string>('LIVEKIT_API_SECRET')!;
    const wsUrl = this.cfg.get<string>('LIVEKIT_WS_URL')!; // ws(s) 주소

    const grant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      // 필요 시: canPublishData: true, canPublishSources: ['microphone']
    };

    const at = new AccessToken(apiKey, apiSec, {
      identity,
      name,
      ttl: ttlSec,
    });
    at.addGrant(grant);

    const token = await at.toJwt();
    return { url: wsUrl, token };
  }
}
