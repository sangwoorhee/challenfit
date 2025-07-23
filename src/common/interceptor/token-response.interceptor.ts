import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  
  export interface TokenResponse<T> {
    data: T;
    tokenInfo?: {
      refreshed: boolean;
      newAccessToken?: string;
      newRefreshToken?: string;
    };
  }
  
  @Injectable()
  export class TokenResponseInterceptor<T> implements NestInterceptor<T, TokenResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<TokenResponse<T>> {
      const response = context.switchToHttp().getResponse();
      
      return next.handle().pipe(
        map(data => {
          // 응답 헤더에서 토큰 정보 확인
          const tokenRefreshed = response.getHeader('X-Token-Refreshed') === 'true';
          const newAccessToken = response.getHeader('X-New-Access-Token');
          const newRefreshToken = response.getHeader('X-New-Refresh-Token');
          
          // 토큰이 갱신된 경우에만 tokenInfo 추가
          if (tokenRefreshed && newAccessToken) {
            return {
              data,
              tokenInfo: {
                refreshed: true,
                newAccessToken,
                newRefreshToken,
              },
            };
          }
          
          // 토큰 갱신이 없는 경우 기존 응답 반환
          return { data };
        }),
      );
    }
  }