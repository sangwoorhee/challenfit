import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
// JWT 인증 가드를 사용하여 HTTP 요청을 보호합니다.
export class JwtAuthGuard extends AuthGuard('jwt') {}
