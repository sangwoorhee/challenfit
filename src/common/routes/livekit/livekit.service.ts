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

  // 현재 배포 환경(Blue/Green)에 따라 적절한 LiveKit URL을 결정
  private getCurrentLiveKitUrl(): string {
    // docker-compose.yml에서 설정한 LIVEKIT_ENVIRONMENT 환경변수 사용
    const environment = this.cfg.get<string>('LIVEKIT_ENVIRONMENT');
    
    if (environment === 'blue') {
      return this.cfg.get<string>('LIVEKIT_WS_URL_BLUE') || 'ws://43.200.3.200:7880';
    } else if (environment === 'green') {
      return this.cfg.get<string>('LIVEKIT_WS_URL_GREEN') || 'ws://43.200.3.200:7882';
    }
    
    // 기본값: Blue 환경
    return this.cfg.get<string>('LIVEKIT_WS_URL_BLUE') || 'ws://43.200.3.200:7880';
  }

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
    
    // 🔄 블루-그린 배포 환경에 따라 동적으로 URL 선택
    const wsUrl = this.getCurrentLiveKitUrl();

    const grant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
    };

    const at = new AccessToken(apiKey, apiSec, {
      identity,
      name,
      ttl: ttlSec,
    });
    at.addGrant(grant);

    const token = await at.toJwt();
    
    // 🐛 디버깅을 위한 로그
    console.log(`[LiveKit] Environment: ${this.cfg.get('LIVEKIT_ENVIRONMENT')}, Using URL: ${wsUrl} for room: ${roomName}`);
    
    return { url: wsUrl, token };
  }

  // 현재 LiveKit 서버 상태 확인 (Health Check용)
  async getServerStatus(): Promise<{ url: string; status: string; environment: string }> {
    const wsUrl = this.getCurrentLiveKitUrl();
    const environment = this.cfg.get<string>('LIVEKIT_ENVIRONMENT') || 'blue';
    
    try {
      // LiveKit 서버 연결 테스트
      const rooms = await this.rooms.listRooms();
      return {
        url: wsUrl,
        environment,
        status: 'healthy'
      };
    } catch (error) {
      console.error(`[LiveKit] Health check failed for ${environment}:`, error.message);
      return {
        url: wsUrl,
        environment,
        status: 'unhealthy'
      };
    }
  }
}
