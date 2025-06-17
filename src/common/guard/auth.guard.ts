import {
  CanActivate,
  ExecutionContext,
  Injectable,
  // UnauthorizedException,
} from '@nestjs/common';
import { CustomRequest } from 'src/types/custom-request';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CustomRequest>();
    console.log('AuthGuard - req.user:', request.user);

    if (request.user && request.user.member_seq) {
      return true; // 인증 성공
    }
    console.log('AuthGuard - No user found');
    return false; // UnauthorizedException 대신 false를 반환하여 401 Unauthorized로 명시적으로 처리
    // throw new UnauthorizedException('인증이 필요합니다.');
  }
}
