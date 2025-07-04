import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkoutcertService } from './workoutcert.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { WorkoutCert } from 'src/common/entities/workout-cert.entity';
import { CreateWorkoutCertReqDto, UpdateWorkoutCertReqDto } from './dto/req.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('운동 인증')
@Controller('workoutcert')
export class WorkoutcertController {
  constructor(private readonly workoutcertService: WorkoutcertService) {}

  // 1. 내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회
  // GET : http://localhost:3000/workoutcert/my
  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
      summary: '내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회',
      description: 'GET : http://localhost:3000/workoutcert/my',
    })
  async getMyWorkoutCerts(@User() user: UserAfterAuth): Promise<WorkoutCert[]> {
    return await this.workoutcertService.getWorkoutCertsByUser(user.idx);
  }

  // 2. 인증글 생성
  // POST : http://localhost:3000/workoutcert
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
      summary: '인증글 생성',
      description: 'POST : http://localhost:3000/workoutcert',
    })
  async createWorkoutCert(
    @Body() dto: CreateWorkoutCertReqDto,
    @User() user: UserAfterAuth,
  ): Promise<WorkoutCert> {
    return await this.workoutcertService.createWorkoutCert(user.idx, dto);
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

  // 5. 인증글 수정
  // PATCH : http://localhost:3000/workoutcert/:workoutcert_idx
  @Patch(':idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
      summary: '인증글 수정',
      description: 'PATCH : http://localhost:3000/workoutcert/:workoutcert_idx',
    })
  async updateWorkoutCert(
    @Param('idx') idx: string,
    @Body() dto: UpdateWorkoutCertReqDto,
    @User() user: UserAfterAuth,
  ): Promise<WorkoutCert> {
    const cert = await this.workoutcertService.getWorkoutCertDetail(idx);
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');

    const user_idx = user.idx;
    return await this.workoutcertService.updateWorkoutCert(idx, dto, user_idx);
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
}