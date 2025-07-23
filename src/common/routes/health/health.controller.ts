import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('헬스체크')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  // 1. 시스템 헬스체크
  // GET : http://localhost:3000/health
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: '시스템 헬스체크',
    description: 'DB 연결, Redis, 메모리, 디스크 상태를 확인합니다.',
  })
  check() {
    return this.health.check([
      // Database 헬스체크
      () => this.db.pingCheck('database'),
      
      // Redis 헬스체크
      () => this.healthService.checkRedis('redis'),
      
      // 메모리 헬스체크 (힙 메모리가 300MB 미만인지 확인)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      
      // 메모리 RSS 체크 (600MB 미만인지 확인)
      () => this.memory.checkRSS('memory_rss', 600 * 1024 * 1024),
      
      // 디스크 사용량 체크 (사용률 90% 미만인지 확인)
      () => this.disk.checkStorage('disk', { 
        thresholdPercent: 0.9, 
        path: '/' 
      }),
    ]);
  }

  // 2. 간단한 헬스체크
  // GET : http://localhost:3000/health/simple
  @Get('simple')
  @ApiOperation({
    summary: '간단한 헬스체크',
    description: '서버가 정상 작동하는지 확인합니다.',
  })
  simpleCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // 3. DB 연결 상태 확인
  // GET : http://localhost:3000/health/db
  @Get('db')
  @HealthCheck()
  @ApiOperation({
    summary: 'DB 연결 상태 확인',
    description: 'PostgreSQL 데이터베이스 연결 상태를 확인합니다.',
  })
  checkDatabase() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  // 4. Redis 연결 상태 확인
  // GET : http://localhost:3000/health/redis
  @Get('redis')
  @HealthCheck()
  @ApiOperation({
    summary: 'Redis 연결 상태 확인',
    description: 'Redis 캐시 서버 연결 상태를 확인합니다.',
  })
  checkRedis() {
    return this.health.check([
      () => this.healthService.checkRedis('redis'),
    ]);
  }
}