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
import { FollowRequestActionDto, FollowUserReqDto } from './dto/req.dto';
import { FollowResDto, FollowListResDto } from './dto/res.dto';

@ApiTags('팔로우')
@ApiBearerAuth()
@Controller('follow')
@UseGuards(JwtAuthGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // 1. 팔로우하기 (공개: 즉시 팔로우, 비공개: 팔로우 신청)
  // http://localhost:3000/follow
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '유저 팔로우 (공개 프로필: 즉시 팔로우, 비공개 프로필: 팔로우 신청)',
    description: 'POST : http://localhost:3000/follow',
  })
  async followUser(
    @User() user: UserAfterAuth,
    @Body() dto: FollowUserReqDto,
  ): Promise<FollowResDto> {
    return await this.followService.followUser(user.idx, dto.target_user_idx);
  }

  // 2. 팔로우 관련 알림 삭제
  // http://localhost:3000/follow/notifications
  @Delete('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '팔로우 관련 알림 삭제',
    description: 'DELETE : http://localhost:3000/follow/notifications',
  })
  async clearFollowNotifications(
    @User() user: UserAfterAuth,
  ): Promise<FollowResDto> {
    await this.followService.clearFollowNotifications(user.idx);
    return { message: '알림을 모두 삭제했습니다.' };
  }

  // 3. 언팔로우하기
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

  // 4. 팔로우 요청 수락
  // http://localhost:3000/follow/request/accept
  @Post('request/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '팔로우 요청 수락',
    description: 'POST : http://localhost:3000/follow/request/accept',
  })
  async acceptFollowRequest(
    @User() user: UserAfterAuth,
    @Body() dto: FollowRequestActionDto,
  ): Promise<FollowResDto> {
    return await this.followService.acceptFollowRequest(user.idx, dto.requester_idx);
  }

  // 5. 팔로우 요청 거절
  // http://localhost:3000/follow/request/reject
  @Post('request/reject')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '팔로우 요청 거절',
    description: 'POST : http://localhost:3000/follow/request/reject',
  })
  async rejectFollowRequest(
    @User() user: UserAfterAuth,
    @Body() dto: FollowRequestActionDto,
  ): Promise<FollowResDto> {
    return await this.followService.rejectFollowRequest(user.idx, dto.requester_idx);
  }

  // 6. 팔로우 요청 취소
  // http://localhost:3000/follow/request/cancel/:requested_idx
  @Delete('request/cancel/:requested_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '팔로우 요청 취소',
    description: 'DELETE : http://localhost:3000/follow/request/cancel/:requested_idx',
  })
  async cancelFollowRequest(
    @User() user: UserAfterAuth,
    @Param('requested_idx') requested_idx: string,
  ): Promise<FollowResDto> {
    return await this.followService.cancelFollowRequest(user.idx, requested_idx);
  }

  // 7. 내가 보낸 팔로우 요청 목록
  // http://localhost:3000/follow/request/sent
  @Get('request/sent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내가 보낸 팔로우 요청 목록',
    description: 'GET : http://localhost:3000/follow/request/sent',
  })
  async getSentFollowRequests(
    @User() user: UserAfterAuth,
  ): Promise<any> {
    return await this.followService.getSentFollowRequests(user.idx);
  }

  // 8. 내가 받은 팔로우 요청 목록
  // http://localhost:3000/follow/request/received
  @Get('request/received')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내가 받은 팔로우 요청 목록',
    description: 'GET : http://localhost:3000/follow/request/received',
  })
  async getReceivedFollowRequests(
    @User() user: UserAfterAuth,
  ): Promise<any> {
    return await this.followService.getReceivedFollowRequests(user.idx);
  }

  // 9. 특정 유저의 팔로잉 목록 조회
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

  // 10. 특정 유저의 팔로워 목록 조회
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

  // 11. 내 팔로잉 목록 조회
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

  // 12. 내 팔로워 목록 조회
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

  // 13. 팔로우 관련 알림 조회
  // http://localhost:3000/follow/notifications
  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '팔로우 관련 알림 조회',
    description: 'GET : http://localhost:3000/follow/notifications',
  })
  async getFollowNotifications(
    @User() user: UserAfterAuth,
  ): Promise<any[]> {
    return await this.followService.getFollowNotifications(user.idx);
  }
}