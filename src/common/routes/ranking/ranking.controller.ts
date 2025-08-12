import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { GetRankingReqDto } from './dto/req.dto';
import { GetRankingResDto } from './dto/res.dto';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';

@ApiTags('랭킹')
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  // 1. 전체 사용자 포인트 랭킹 조회
  @Get()
  @ApiOperation({
    summary: '사용자 포인트 랭킹 조회',
    description: 'GET: http://localhost:3000/ranking?page=1&size=10',
  })
  async getUserRankings(@Query() dto: GetRankingReqDto): Promise<GetRankingResDto> {
    return await this.rankingService.getUserRankings(dto);
  }

  // 2. 특정 사용자의 랭킹 조회
  @Get('user/:user_idx')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '특정 사용자의 랭킹 조회',
    description: 'GET: http://localhost:3000/ranking/user/:user_idx',
  })
  @ApiParam({
    name: 'user_idx',
    description: '사용자 ID',
    format: 'uuid',
  })
  async getUserRank(@Param('user_idx') userIdx: string) {
    const rankInfo = await this.rankingService.getUserRank(userIdx);
    
    if (!rankInfo) {
      return {
        result: 'error',
        message: '사용자를 찾을 수 없거나 프로필이 없습니다.',
      };
    }

    return {
      result: 'ok',
      user_idx: userIdx,
      rank: rankInfo.rank,
      points: rankInfo.points,
    };
  }

  // 3. 내 랭킹 조회
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '내 랭킹 조회',
    description: 'GET: http://localhost:3000/ranking/me\n\n현재 로그인한 사용자의 랭킹과 포인트를 조회합니다.',
  })
  async getMyRank(@User() user: UserAfterAuth) {
    const rankInfo = await this.rankingService.getUserRank(user.idx);
    
    if (!rankInfo) {
      return {
        result: 'error',
        message: '프로필 정보를 찾을 수 없습니다.',
      };
    }

    return {
      result: 'ok',
      user_idx: user.idx,
      rank: rankInfo.rank,
      points: rankInfo.points,
    };
  }
}
