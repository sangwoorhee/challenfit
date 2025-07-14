import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Query,
} from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { CreateWorkoutCertReqDto, UpdateWorkoutCertReqDto } from './dto/req.dto';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { multerConfig } from 'src/common/config/multer-config';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { ApiGetItemsResponse } from 'src/common/decorators/swagger.decorator';
import { PageReqDto } from 'src/common/dto/req.dto';
import { PageResDto } from 'src/common/dto/res.dto';

@ApiTags('운동 인증')
@Controller('workoutcert')
export class WorkoutcertController {
  constructor(private readonly workoutcertService: WorkoutcertService) {}

  // 1. 내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회
  // GET : http://localhost:3000/workoutcert/my
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회 (페이지네이션)',
    description: 'GET : http://localhost:3000/workoutcert/my?page=1&size=10',
  })
  @ApiGetItemsResponse(WorkoutCert)
  async getMyWorkoutCerts(
    @User() user: UserAfterAuth,
    @Query() pageReqDto: PageReqDto,
  ): Promise<PageResDto<WorkoutCert>> {
    const { page, size } = pageReqDto;
    return await this.workoutcertService.getWorkoutCertsByUser(user.idx, page, size);
  }

  // 2. 인증글 생성 (이미지 업로드 포함)
  // POST : http://localhost:3000/workoutcert
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({
      summary: '인증글 생성',
      description: 'POST : http://localhost:3000/workoutcert (multipart/form-data)',
    })
  @ApiConsumes('multipart/form-data')
  async createWorkoutCert(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateWorkoutCertReqDto,
    @User() user: UserAfterAuth,
  ): Promise<WorkoutCert> {
    try {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    // 파일 경로를 image_url로 설정
    const imageUrl = `/uploads/workout-images/${file.filename}`;
    
    return await this.workoutcertService.createWorkoutCert(user.idx, {
      ...dto,
      image_url: imageUrl,
    });
  } catch (error) {
    // 업로드된 파일 삭제 (에러 발생 시)
    if (file) {
      const filePath = path.join(process.cwd(), 'uploads', 'workout-images', file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    throw error;
    }
  }


  // 3. 도전방의 인증글 목록 조회
  // GET : http://localhost:3000/workoutcert/challenge/:challenge_room_idx
  @Get('challenge/:challenge_room_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
      summary: '도전방의 인증글 목록 조회',
      description: 'GET : http://localhost:3000/workoutcert/challenge/:challenge_room_idx',
    })
  async getChallengeRoomWorkoutCerts(@Param('challenge_room_idx') challengeRoomIdx: string): Promise<WorkoutCert[]> {
    return await this.workoutcertService.getChallengeRoomWorkoutCerts(challengeRoomIdx);
  }

  // 4. 인증글 단일 조회
  // GET : http://localhost:3000/workoutcert/:workoutcert_idx
  @Get(':idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
      summary: '인증글 단일 조회',
      description: 'GET : http://localhost:3000/workoutcert/:workoutcert_idx',
    })
  async getWorkoutCertDetail(@Param('idx') idx: string): Promise<WorkoutCert> {
    return await this.workoutcertService.getWorkoutCertDetail(idx);
  }

  // 5. 인증글 수정 (이미지 업로드 포함)
  // PATCH : http://localhost:3000/workoutcert/:workoutcert_idx
  @Patch(':idx')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @ApiOperation({
      summary: '인증글 수정',
      description: 'PATCH : http://localhost:3000/workoutcert/:workoutcert_idx',
    })
  @ApiConsumes('multipart/form-data')
  async updateWorkoutCert(
    @Param('idx') idx: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateWorkoutCertReqDto,
    @User() user: UserAfterAuth,
  ): Promise<WorkoutCert> {
    const cert = await this.workoutcertService.getWorkoutCertDetail(idx);
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');

    const user_idx = user.idx;
    // 새로운 이미지가 업로드된 경우
    let updateData = { ...dto };
    if (file) {
      const imageUrl = `/uploads/workout-images/${file.filename}`;
      // UpdateWorkoutCertReqDto 타입에 image_url이 없으므로 any로 우회
      (updateData as any).image_url = imageUrl;
    }

    return await this.workoutcertService.updateWorkoutCert(idx, updateData, user_idx);
  }

  // 6. 인증글 삭제
  // DELETE : http://localhost:3000/workoutcert/:workoutcert_idx
  @Delete(':idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
      summary: '인증글 삭제',
      description: 'DELETE : http://localhost:3000/workoutcert/:workoutcert_idx',
    })
  async deleteWorkoutCert(@Param('idx') idx: string, @User() user: UserAfterAuth): Promise<void> {
    const cert = await this.workoutcertService.getWorkoutCertDetail(idx);
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
    
    const user_idx = user.idx;
    await this.workoutcertService.deleteWorkoutCert(idx, user_idx);
  }

  // 7. 이미지 파일 서빙
  @Get('image/:filename')
  @ApiOperation({
    summary: '업로드된 이미지 파일 조회',
    description: 'GET : http://localhost:3000/workoutcert/image/:filename',
  })
  async getImage(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    const imagePath = path.join(process.cwd(), 'uploads', 'workout-images', filename);
    
    // 파일 존재 확인
    if (!fs.existsSync(imagePath)) {
      throw new NotFoundException('이미지를 찾을 수 없습니다.');
    }

    res.sendFile(imagePath);
  }

  // 8. 유저의 도전 운동 인증 목록 조회 (페이지네이션)
  // GET : http://localhost:3000/workoutcert/user/:userIdx/challenge/:challengeParticipantIdx?page=1&size=10
  @Get('user/:userIdx/challenge_participant/:challengeParticipantIdx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '특정 유저의 특정 도전에서의 운동 인증 목록 조회 (페이지네이션)',
    description: 'GET : http://localhost:3000/workoutcert/user/:userIdx/challenge/:challengeParticipantIdx?page=1&size=10',
  })
  @ApiGetItemsResponse(WorkoutCert)
  async getWorkoutCertsByUserAndChallengeParticipant(
    @Param('userIdx') userIdx: string,
    @Param('challengeParticipantIdx') challengeParticipantIdx: string,
    @Query() pageReqDto: PageReqDto,
  ): Promise<PageResDto<WorkoutCert>> {
    const { page, size } = pageReqDto;
    return await this.workoutcertService.getWorkoutCertsByUserAndChallengeParticipant(userIdx, challengeParticipantIdx, page, size);
  }

  // 9. 모든 인증글을 최신순으로 조회
  // GET : http://localhost:3000/workoutcert
  @Get()
  @ApiOperation({
    summary: '모든 인증글을 최신순으로 조회',
    description: 'GET : http://localhost:3000/workoutcert',
  })
  async getWorkoutCerts(): Promise<WorkoutCert[]> {
    console.log('되고있나');
    return await this.workoutcertService.getWorkoutCerts();
  }
}