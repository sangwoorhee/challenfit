import {
  Controller, UseGuards, Get, Patch, Body, Req, Delete,
  Param
} from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import {
  UpdateUserSettingReqDto,
  UpdateUserProfileReqDto,
  ChangePasswordReqDto,
} from './dto/req.dto';
import { CommonResDto } from './dto/res.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 1. 내 정보 환경설정 수정
  // http://localhost:3000/user/setting
  @Patch('setting')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '내 정보 환경설정 수정',
    description: 'PATCH : http://localhost:3000/user/setting',
  })
  async updateSetting(
    @User() user: UserAfterAuth,
    @Body() dto: UpdateUserSettingReqDto,
  ): Promise<CommonResDto> {
    return await this.userService.updateSetting(user.idx, dto);
  }

  // 2. 내 마이프로필 수정
  // http://localhost:3000/user/profile
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '내 마이프로필 수정', 
    description: 'PATCH : http://localhost:3000/user/profile',
  })
  async updateProfile(
    @User() user: UserAfterAuth,
    @Body() dto: UpdateUserProfileReqDto,
  ): Promise<CommonResDto> {
    return await this.userService.updateProfile(user.idx, dto);
  }

  // 3. 내 비밀번호 변경
  // http://localhost:3000/user/password
  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '내 비밀번호 변경', 
    description: 'PATCH : http://localhost:3000/user/password',
  })
  async changePassword(
    @User() user: UserAfterAuth,
    @Body() dto: ChangePasswordReqDto,
  ): Promise<CommonResDto> {
    return await this.userService.changePassword(user.idx, dto);
  }

  // 4. 회원탈퇴
  // http://localhost:3000/user
  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '회원탈퇴',
    description: 'DELETE : http://localhost:3000/user'
  })
  async deleteAccount(@User() user: UserAfterAuth,): Promise<CommonResDto> {
    return await this.userService.deleteAccount(user.idx,);
  }

  // 5. 다른 유저의 마이프로필 정보 조회
  // http://localhost:3000/user/profile/:user_idx
  @Get('profile/:user_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '다른 유저의 마이프로필 정보 조회',
    description: 'GET : http://localhost:3000/user/profile/:user_idx',
  })
  async getOtherUserProfile(@Param('user_idx') user_idx: string) {
    return await this.userService.getUserProfile(user_idx);
  }

  // 6. 내 마이프로필 정보 조회
  // http://localhost:3000/user/profile
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '본인의 마이프로필 정보 조회',
    description: 'GET : http://localhost:3000/user/profile',
  })
  async getMyProfile(@User() user: UserAfterAuth) {
    return await this.userService.getUserProfile(user.idx);
  }
}
