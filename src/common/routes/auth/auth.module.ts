import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // AuthService를 다른 모듈에서 사용할 수 있도록 export
})
export class AuthModule {}
