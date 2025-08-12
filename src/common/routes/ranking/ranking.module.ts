import { Module } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RankingController } from './ranking.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ranking } from 'src/common/entities/ranking.entity';
import { UserProfile } from 'src/common/entities/user_profile.entity';
import { User } from 'src/common/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, Ranking]),
  ],
  controllers: [RankingController],
  providers: [RankingService],
})
export class RankingModule {}
