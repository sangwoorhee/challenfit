import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('헬스체크')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
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
      // Redis 헬스체크
      () => this.healthService.checkRedis('redis'),
      
      // 시스템 상태 기본 체크
      () => this.healthService.checkSystem('system'),
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

  // 3. 시스템 상태 확인
  // GET : http://localhost:3000/health/system
  @Get('system')
  @HealthCheck()
  @ApiOperation({
    summary: '시스템 상태 확인',
    description: '서버 시스템 상태 (메모리, 업타임 등)를 확인합니다.',
  })
  checkSystemStatus() {
    return this.health.check([
      () => this.healthService.checkSystem('system'),
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