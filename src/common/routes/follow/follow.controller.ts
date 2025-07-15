import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { FollowService } from './follow.service';
import { FollowUserReqDto } from './dto/req.dto';
import { FollowResDto, FollowListResDto } from './dto/res.dto';

@ApiTags('팔로우')
@ApiBearerAuth()
@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // 1. 팔로우하기
  // http://localhost:3000/follow
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '유저 팔로우',
    description: 'POST : http://localhost:3000/follow',
  })
  async followUser(
    @User() user: UserAfterAuth,
    @Body() dto: FollowUserReqDto,
  ): Promise<FollowResDto> {
    return await this.followService.followUser(user.idx, dto.target_user_idx);
  }

  // 2. 언팔로우하기
  // http://localhost:3000/follow/:target_user_idx
  @Delete(':target_user_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '유저 언팔로우',
    description: 'DELETE : http://localhost:3000/follow/:target_user_idx',
  })
  async unfollowUser(
    @User() user: UserAfterAuth,
    @Param('target_user_idx') target_user_idx: string,
  ): Promise<FollowResDto> {
    return await this.followService.unfollowUser(user.idx, target_user_idx);
  }

  // 3. 특정 유저의 팔로잉 목록 조회
  // http://localhost:3000/follow/following/:user_idx
  @Get('following/:user_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '유저의 팔로잉 목록 조회',
    description: 'GET : http://localhost:3000/follow/following/:user_idx',
  })
  async getFollowingList(
    @User() user: UserAfterAuth,
    @Param('user_idx') user_idx: string,
  ): Promise<FollowListResDto> {
    return await this.followService.getFollowingList(user_idx, user.idx);
  }

  // 4. 특정 유저의 팔로워 목록 조회
  // http://localhost:3000/follow/follower/:user_idx
  @Get('follower/:user_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '유저의 팔로워 목록 조회',
    description: 'GET : http://localhost:3000/follow/follower/:user_idx',
  })
  async getFollowerList(
    @User() user: UserAfterAuth,
    @Param('user_idx') user_idx: string,
  ): Promise<FollowListResDto> {
    return await this.followService.getFollowerList(user_idx, user.idx);
  }

  // 5. 내 팔로잉 목록 조회
  // http://localhost:3000/follow/my/following
  @Get('my/following')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내 팔로잉 목록 조회',
    description: 'GET : http://localhost:3000/follow/my/following',
  })
  async getMyFollowingList(
    @User() user: UserAfterAuth,
  ): Promise<FollowListResDto> {
    return await this.followService.getFollowingList(user.idx, user.idx);
  }

  // 6. 내 팔로워 목록 조회
  // http://localhost:3000/follow/my/follower
  @Get('my/follower')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내 팔로워 목록 조회',
    description: 'GET : http://localhost:3000/follow/my/follower',
  })
  async getMyFollowerList(
    @User() user: UserAfterAuth,
  ): Promise<FollowListResDto> {
    return await this.followService.getFollowerList(user.idx, user.idx);
  }
}