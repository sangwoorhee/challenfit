import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Observable, throwError } from 'rxjs';
  import { catchError, switchMap } from 'rxjs/operators';
  import { JwtService } from '@nestjs/jwt';
  import { AuthService } from 'src/common/routes/auth/auth.service';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { RefreshToken } from 'src/common/entities/refresh_token.entity';
  import { User } from 'src/common/entities/user.entity';
  import { UserStatus } from '../enum/enum';
  
  @Injectable()
  export class JwtRefreshInterceptor implements NestInterceptor {
    constructor(
      private jwtService: JwtService,
      private authService: AuthService,
      @InjectRepository(RefreshToken)
      private refreshTokenRepository: Repository<RefreshToken>,
      @InjectRepository(User)
      private userRepository: Repository<User>,
    ) {}
  
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const request = context.switchToHttp().getRequest();
      const response = context.switchToHttp().getResponse();
      
      // Authorization 헤더에서 토큰 추출
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next.handle();
      }
  
      const token = authHeader.substring(7);
      
      try {
        // 토큰 검증
        const decoded = this.jwtService.verify(token);
        
        // 토큰 만료 시간 체크 (30분 이내 만료 예정이면 갱신)
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        
        if (timeUntilExpiry < 1800) { // 30분 = 1800초
          // 리프레시 토큰으로 새 액세스 토큰 발급
          const newTokens = await this.refreshAccessToken(decoded.sub);
          
          if (newTokens) {
            // 새 토큰을 응답 헤더에 추가
            response.setHeader('X-New-Access-Token', newTokens.accessToken);
            response.setHeader('X-New-Refresh-Token', newTokens.refreshToken);
            
            // 요청 헤더도 업데이트
            request.headers.authorization = `Bearer ${newTokens.accessToken}`;
          }
        }
        
        // 사용자 정보를 request에 추가
        request.user = await this.userRepository.findOne({ 
          where: { idx: decoded.sub },
          relations: ['profile', 'setting']
        });
        
      } catch (error) {
        // Access Token이 만료된 경우
        if (error.name === 'TokenExpiredError') {
          try {
            // 토큰에서 사용자 ID 추출 (만료되어도 페이로드는 읽을 수 있음)
            const decoded = this.jwtService.decode(token) as any;
            
            if (decoded && decoded.sub) {
              // 리프레시 토큰으로 새 토큰 발급 시도
              const newTokens = await this.refreshAccessToken(decoded.sub);
              
              if (newTokens) {
                // 새 토큰을 응답 헤더에 추가
                response.setHeader('X-New-Access-Token', newTokens.accessToken);
                response.setHeader('X-New-Refresh-Token', newTokens.refreshToken);
                
                // 요청 헤더 업데이트
                request.headers.authorization = `Bearer ${newTokens.accessToken}`;
                
                // 사용자 정보를 request에 추가
                request.user = await this.userRepository.findOne({ 
                  where: { idx: decoded.sub },
                  relations: ['profile', 'setting']
                });
                
                return next.handle();
              }
            }
          } catch (refreshError) {
            console.error('토큰 갱신 실패:', refreshError);
          }
        }
        
        // 토큰 갱신 실패 또는 다른 오류
        throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
      }
      
      return next.handle();
    }
  
    private async refreshAccessToken(userId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
      try {
        // 사용자의 리프레시 토큰 조회
        const refreshTokenEntity = await this.refreshTokenRepository.findOne({
          where: { user: { idx: userId } },
          relations: ['user']
        });
  
        if (!refreshTokenEntity) {
          return null;
        }
  
        // 리프레시 토큰 검증
        try {
          this.jwtService.verify(refreshTokenEntity.token, { 
            secret: process.env.JWT_SECRET 
          });
        } catch (error) {
          if (error.name === 'TokenExpiredError') {
            // 리프레시 토큰도 만료된 경우 - 자동 갱신
            console.log('리프레시 토큰 만료 - 자동 갱신 시작');
            
            // 사용자 상태 확인
            const user = await this.userRepository.findOne({ 
              where: { idx: userId } 
            });
            
            if (!user || user.status !== UserStatus.ACTIVE) {
              return null;
            }
            
            // 새로운 토큰 쌍 생성
            const newAccessToken = this.authService.generateAccessToken(userId);
            const newRefreshToken = this.authService.generateRefreshToken(userId);
            
            // 리프레시 토큰 업데이트
            refreshTokenEntity.token = newRefreshToken;
            await this.refreshTokenRepository.save(refreshTokenEntity);
            
            return {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken
            };
          }
          throw error;
        }
  
        // 리프레시 토큰이 유효한 경우 - 새 액세스 토큰 발급
        const newAccessToken = this.authService.generateAccessToken(userId);
        
        // 리프레시 토큰의 남은 유효기간 확인
        const decoded = this.jwtService.decode(refreshTokenEntity.token) as any;
        const now = Math.floor(Date.now() / 1000);
        const refreshTokenTimeLeft = decoded.exp - now;
        
        // 리프레시 토큰의 유효기간이 7일 미만이면 갱신
        if (refreshTokenTimeLeft < 604800) { // 7일 = 604800초
          const newRefreshToken = this.authService.generateRefreshToken(userId);
          refreshTokenEntity.token = newRefreshToken;
          await this.refreshTokenRepository.save(refreshTokenEntity);
          
          return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          };
        }
        
        return {
          accessToken: newAccessToken,
          refreshToken: refreshTokenEntity.token
        };
        
      } catch (error) {
        console.error('리프레시 토큰 처리 중 오류:', error);
        return null;
      }
    }
  }