import {
  Controller, UseGuards, Get, Patch, Body, Req, Delete
} from '@nestjs/common';
import { UserService } from './user.service';
// import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import {
  UpdateUserSettingReqDto,
  UpdateUserProfileReqDto,
  ChangePasswordReqDto,
} from './dto/req.dto';
import { CommonResDto } from './dto/res.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 1. 회원 환경설정 수정
  @Patch('setting')
  @ApiOperation({ summary: '회원 환경설정 수정' })
  async updateSetting(
    @Req() req,
    @Body() dto: UpdateUserSettingReqDto,
  ): Promise<CommonResDto> {
    return this.userService.updateSetting(req.user.id, dto);
  }

  // 2. 마이프로필 수정
  @Patch('profile')
  @ApiOperation({ summary: '마이프로필 수정' })
  async updateProfile(
    @Req() req,
    @Body() dto: UpdateUserProfileReqDto,
  ): Promise<CommonResDto> {
    return this.userService.updateProfile(req.user.id, dto);
  }

  // 3. 비밀번호 변경
  @Patch('password')
  @ApiOperation({ summary: '비밀번호 변경' })
  async changePassword(
    @Req() req,
    @Body() dto: ChangePasswordReqDto,
  ): Promise<CommonResDto> {
    return this.userService.changePassword(req.user.id, dto);
  }

  // 4. 회원탈퇴
  @Delete()
  @ApiOperation({ summary: '회원탈퇴' })
  async deleteAccount(@Req() req): Promise<CommonResDto> {
    return this.userService.deleteAccount(req.user.id);
  }
}
