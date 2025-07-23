// JWT 미들웨어 생성 (모든 요청에 대한 자동 토큰 처리)
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from 'src/common/entities/refresh_token.entity';
import { User } from 'src/common/entities/user.entity';
import { AuthService } from 'src/common/routes/auth/auth.service';
import { UserStatus } from '../enum/enum';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // 인증이 필요없는 경로는 건너뛰기
    const publicPaths = [
      '/auth/login',
      '/auth/signup',
      '/auth/verify-sms',
      '/auth/verify-sms-code',
      '/auth/verify-email',
      '/auth/refresh',
      '/health',
      '/docs',
    ];

    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    if (isPublicPath) {
      return next();
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      // 토큰 검증
      const decoded = this.jwtService.verify(token);
      
      // 토큰 만료 시간 체크
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      
      // 토큰이 30분 이내에 만료될 예정이면 갱신
      if (timeUntilExpiry < 1800) {
        const newTokens = await this.refreshTokens(decoded.sub);
        
        if (newTokens) {
          // 응답 헤더에 새 토큰 추가
          res.setHeader('X-New-Access-Token', newTokens.accessToken);
          
          // 리프레시 토큰도 갱신된 경우
          if (newTokens.refreshToken) {
            res.setHeader('X-New-Refresh-Token', newTokens.refreshToken);
          }
          
          // 토큰 갱신 여부를 클라이언트에 알림
          res.setHeader('X-Token-Refreshed', 'true');
        }
      }
      
      // 사용자 정보를 request에 추가
      (req as any).user = await this.userRepository.findOne({ 
        where: { idx: decoded.sub },
        relations: ['profile', 'setting']
      });
      
    } catch (error) {
      // Access Token이 만료된 경우
      if (error.name === 'TokenExpiredError') {
        try {
          const decoded = this.jwtService.decode(token) as any;
          
          if (decoded && decoded.sub) {
            const newTokens = await this.refreshTokens(decoded.sub);
            
            if (newTokens) {
              // 응답 헤더에 새 토큰 추가
              res.setHeader('X-New-Access-Token', newTokens.accessToken);
              
              if (newTokens.refreshToken) {
                res.setHeader('X-New-Refresh-Token', newTokens.refreshToken);
              }
              
              res.setHeader('X-Token-Refreshed', 'true');
              
              // 새 토큰으로 요청 헤더 업데이트
              req.headers.authorization = `Bearer ${newTokens.accessToken}`;
              
              // 사용자 정보를 request에 추가
              (req as any).user = await this.userRepository.findOne({ 
                where: { idx: decoded.sub },
                relations: ['profile', 'setting']
              });
            }
          }
        } catch (refreshError) {
          console.error('토큰 갱신 실패:', refreshError);
        }
      }
    }
    
    next();
  }

  private async refreshTokens(userId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
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
        const decoded = this.jwtService.verify(refreshTokenEntity.token, { 
          secret: process.env.JWT_SECRET 
        });
        
        // 새 액세스 토큰 발급
        const newAccessToken = this.authService.generateAccessToken(userId);
        
        // 리프레시 토큰의 남은 유효기간 확인
        const now = Math.floor(Date.now() / 1000);
        const refreshTokenTimeLeft = decoded.exp - now;
        
        // 리프레시 토큰이 7일 미만 남았으면 갱신
        if (refreshTokenTimeLeft < 604800) {
          const newRefreshToken = this.authService.generateRefreshToken(userId);
          refreshTokenEntity.token = newRefreshToken;
          await this.refreshTokenRepository.save(refreshTokenEntity);
          
          return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          };
        }
        
        return {
          accessToken: newAccessToken
        };
        
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          // 리프레시 토큰도 만료된 경우 - 자동 갱신
          console.log('리프레시 토큰 만료 - 자동 갱신');
          
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
    } catch (error) {
      console.error('리프레시 토큰 처리 중 오류:', error);
      return null;
    }
  }
}