import { Controller, Post, Get, Param, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { WorkoutcertapprovalService } from './workoutcertapproval.service';
import { CreateCertApprovalReqDto } from './dto/req.dto';
import { CertApproval } from 'src/common/entities/cert_approval.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CertApprovalResDto, CertApprovalsResDto } from './dto/res.dto';

@ApiTags('운동 인증 승인')
@Controller('workoutcertapproval')
export class WorkoutcertapprovalController {
  constructor(
    private readonly workoutcertapprovalService: WorkoutcertapprovalService,
  ) {}

  // 1. 인증 승인 생성
  // POST : http://localhost:3000/workoutcertapproval
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '인증 승인 생성', 
    description: 'POST : http://localhost:3000/workoutcertapproval' 
  })
  async createApproval(
    @Body() dto: CreateCertApprovalReqDto,
    @User() user: UserAfterAuth,
  ): Promise<CertApprovalResDto> {
    const approval = await this.workoutcertapprovalService.createApproval(user.idx, dto);
    return { result: 'ok', approval };
  }

  // 2. 인증 승인 목록 조회
  // GET : http://localhost:3000/workoutcertapproval/cert/:workout_cert_idx
  @Get('cert/:workout_cert_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '인증 승인 목록 조회', 
    description: 'GET : http://localhost:3000/workoutcertapproval/cert/:workout_cert_idx' 
  })
  async getApprovals(
    @Param('workout_cert_idx') workoutCertIdx: string,
  ): Promise<CertApprovalsResDto> {
    const approvals = await this.workoutcertapprovalService.getApprovalsByCert(workoutCertIdx);
    if (!approvals || approvals.length === 0) throw new NotFoundException('인증 승인을 찾을 수 없습니다.');
    return { result: 'ok', approvals };
  }
}
