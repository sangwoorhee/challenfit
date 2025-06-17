import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CustomRequest } from 'src/types/custom-request';

// HTTP 요청에서 사용자 정보를 추출 (현재 인증된(로그인된) 사용자의 정보)
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<CustomRequest>();
    return request.user;
  },
);

// 인증되고 난 후의 유저 정보
export interface UserAfterAuth {
  member_seq: number;
  member_id: string;
}
