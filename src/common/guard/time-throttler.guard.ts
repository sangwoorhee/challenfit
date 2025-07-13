// middleware/time-window-throttle.middleware.ts
import { NestMiddleware, Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimeBasedThrottlerGuard implements NestMiddleware {
  // 요청 수를 기록하는 Map: key는 "IP:URL", value는 { count, timestamp }
  private requestCounts = new Map<
    string,
    { count: number; timestamp: number }
  >();

  use(req: Request, res: Response, next: NextFunction) {
    const ip =
      req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `${ip}:${req.originalUrl}`;

    const now = new Date();
    const hour = now.getHours(); // 현재 시각(0~23)
    const day = now.getDay(); // 요일 (0=일요일, 1=월요일, ..., 6=토요일)

    // ✅ 조건: 월~금(1~5)이면서, 새벽 2시 이상 5시 미만일 때만 제한
    const isWeekday = day >= 1 && day <= 5;
    const isEarlyMorning = hour >= 2 && hour < 5;

    if (isWeekday && isEarlyMorning) {
      const windowSize = 60 * 60 * 1000; // 1시간
      const maxRequests = 100; // 1시간에 100회 제한

      const currentTimestamp = now.getTime();
      const record = this.requestCounts.get(key) || {
        count: 0,
        timestamp: currentTimestamp,
      };

      // 요청 기록이 1시간 이전이면 카운터 리셋
      if (currentTimestamp - record.timestamp > windowSize) {
        this.requestCounts.delete(key); // 👈 메모리 최적화
        this.requestCounts.set(key, { count: 1, timestamp: currentTimestamp });
      } else {
        // 요청 횟수가 초과되었을 경우 응답 제한
        if (record.count >= maxRequests) {
          return res.status(429).json({
            message: '요청이 너무 많습니다. 나중에 다시 시도해 주세요.',
          });
        }

        // 요청 횟수 증가
        this.requestCounts.set(key, {
          count: record.count + 1,
          timestamp: record.timestamp,
        });
      }
    }

    // 제한 시간대가 아니면 모든 요청 허용
    next();
  }
}
