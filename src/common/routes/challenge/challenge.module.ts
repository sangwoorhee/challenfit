import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';

@Module({
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService], // ChallengeService를 다른 모듈에서 사용할 수 있도록 export
})
export class ChallengeModule {}
