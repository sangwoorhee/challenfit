import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicatorResult, HealthCheckError, HealthIndicatorService } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class HealthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private healthIndicatorService: HealthIndicatorService,
  ) {}

  async checkRedis(key: string): Promise<HealthIndicatorResult> {
    const testKey = 'health_check_test';
    const testValue = 'ok';
    
    try {
      // Redis에 테스트 값 저장
      await (this.cacheManager as any).set(testKey, testValue, { ttl: 10 });
      
      // 저장된 값 조회
      const result = await this.cacheManager.get(testKey);
      
      // 값 검증
      if (result === testValue) {
        // 테스트 키 삭제
        await this.cacheManager.del(testKey);
        
        return {
          [key]: {
            status: 'up',
            message: 'Redis is working properly',
          },
        };
      }
      
      throw new Error('Redis returned unexpected value');
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        {
          [key]: {
            status: 'down',
            message: error.message,
          },
        },
      );
    }
  }
}