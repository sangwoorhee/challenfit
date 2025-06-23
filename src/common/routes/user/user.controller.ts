import {
  Controller, UseGuards, Get, Patch, Body, Req, Delete
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

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 1. 내 정보 환경설정 수정
  @Patch('setting')
  @ApiOperation({ 
    summary: '내 정보 환경설정 수정',
    description: 'PATCH : http://localhost:3000/user/setting',
  })
  async updateSetting(
    @User() user: UserAfterAuth,
    @Body() dto: UpdateUserSettingReqDto,
  ): Promise<CommonResDto> {
    return this.userService.updateSetting(user.idx, dto);
  }

  // 2. 내 마이프로필 수정
  @Patch('profile')
  @ApiOperation({ 
    summary: '내 마이프로필 수정', 
    description: 'PATCH : http://localhost:3000/user/profile',
  })
  async updateProfile(
    @User() user: UserAfterAuth,
    @Body() dto: UpdateUserProfileReqDto,
  ): Promise<CommonResDto> {
    return this.userService.updateProfile(user.idx, dto);
  }

  // 3. 내 비밀번호 변경
  @Patch('password')
  @ApiOperation({ 
    summary: '내 비밀번호 변경', 
    description: 'PATCH : http://localhost:3000/user/password',
  })
  async changePassword(
    @User() user: UserAfterAuth,
    @Body() dto: ChangePasswordReqDto,
  ): Promise<CommonResDto> {
    return this.userService.changePassword(user.idx, dto);
  }

  // 4. 회원탈퇴
  @Delete()
  @ApiOperation({ 
    summary: '회원탈퇴',
    description: 'DELETE : http://localhost:3000/user'
  })
  async deleteAccount(@User() user: UserAfterAuth,): Promise<CommonResDto> {
    return this.userService.deleteAccount(user.idx,);
  }
}
