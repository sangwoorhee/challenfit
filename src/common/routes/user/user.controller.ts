import {
  Controller, UseGuards, Get, Patch, Body, Req, Delete,
  Param,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import {
  UpdateUserSettingReqDto,
  UpdateUserProfileReqDto,
  ChangePasswordReqDto,
} from './dto/req.dto';
import { CommonResDto } from './dto/res.dto';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { createMulterConfig } from 'src/common/config/multer-config';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('유저')
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
  @UseInterceptors(FileInterceptor('profile_image_url', createMulterConfig('auth')))
  @ApiOperation({ 
    summary: '내 마이프로필 수정', 
    description: 'PATCH : http://localhost:3000/user/profile',
  })
  @ApiConsumes('multipart/form-data')
  async updateProfile(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserAfterAuth,
    @Body() dto: UpdateUserProfileReqDto,
  ): Promise<CommonResDto> {
    try {
    // 파일이 업로드된 경우에만 이미지 URL 설정
    const updateData = { ...dto };
      
    if (file) {
      const imageUrl = `/uploads/auth/${file.filename}`;
      updateData.profile_image_url = imageUrl;
    }

    return await this.userService.updateProfile(user.idx, updateData);
  } catch (error) {
    // 업로드된 파일 삭제 (에러 발생 시)
    if (file) {
      const filePath = path.join(process.cwd(), 'uploads', 'auth', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    throw error;
  }
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
