import { Module } from '@nestjs/common';
import { ChallengeparticipantService } from './challengeparticipant.service';
import { ChallengeparticipantController } from './challengeparticipant.controller';

@Module({
  controllers: [ChallengeparticipantController],
  providers: [ChallengeparticipantService],
})
export class ChallengeparticipantModule {}
