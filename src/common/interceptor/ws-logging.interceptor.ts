// src/common/interceptors/ws-logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';

@Injectable()
export class WebSocketLoggingInterceptor implements NestInterceptor {
  private logger = new Logger('WebSocketLogging');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'ws') {
      return next.handle();
    }

    const client: Socket = context.switchToWs().getClient();
    const event = context.switchToWs().getPattern();
    const data = context.switchToWs().getData();
    const userIdx = client.data.user?.idx || 'anonymous';

    const now = Date.now();

    // 민감한 정보 마스킹
    const sanitizedData = this.sanitizeData(data);

    this.logger.log(`WS ${event} - User: ${userIdx} - Start`);

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - now;
          this.logger.log(
            `WS ${event} - User: ${userIdx} - Success (${duration}ms)`,
          );
          
          // 성능 모니터링을 위한 메트릭 수집
          if (duration > 1000) {
            this.logger.warn(
              `Slow WS operation: ${event} took ${duration}ms`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `WS ${event} - User: ${userIdx} - Error (${duration}ms): ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = ['password', 'token', 'secret'];
    const sanitized = { ...data };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }
}