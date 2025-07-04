import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { CreateLikeReqDto } from './dto/req.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Like } from 'src/common/entities/like.entity';
import { LikeCountResDto, LikeResDto } from './dto/res.dto';

@ApiTags('좋아요')
@Controller('like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  // 1. 운동인증 좋아요 생성
  // POST : http://localhost:3000/like/workoutcert
  @Post('workoutcert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '운동인증 좋아요 생성', 
    description: 'POST : http://localhost:3000/like/workoutcert' 
  })
  async createWorkoutCertLike(
    @Body() dto: CreateLikeReqDto,
    @User() user: UserAfterAuth,
  ): Promise<Like> {
    if (!dto.workout_cert_idx) throw new Error('workout_cert_idx 가 필요합니다.');
    return await this.likeService.createWorkoutCertLike(user.idx, dto.workout_cert_idx);
  }

  // 2. 운동인증 좋아요 수 확인
  // GET : http://localhost:3000/like/count/workoutcert/:workoutcert_idx
  @Get('count/workoutcert/:workoutcert_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '운동인증 좋아요 수 확인', 
    description: 'GET : http://localhost:3000/like/count/workoutcert/:workoutcert_idx' 
  })
  async geteWorkoutCertLikeCount(@Param('workoutcert_idx') workoutCertIdx: string): Promise<number> {
    return await this.likeService.geteWorkoutCertLikeCount(workoutCertIdx);
  }

  // 3. 운동인증 좋아요 목록 확인 (누가 좋아요를 눌렀는지)
  // GET : http://localhost:3000/like/list/workoutcert/:workoutcert_idx
  @Get('list/workoutcert/:workoutcert_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '운동인증 좋아요 목록 확인 (누가 좋아요를 눌렀는지)', 
    description: 'GET : http://localhost:3000/like/list/workoutcert/:workoutcert_idx' 
  })
  async getLikesByWorkoutCert(@Param('workoutcert_idx') workoutCertIdx: string): Promise<Like[]> {
    return await this.likeService.getLikesByWorkoutCert(workoutCertIdx);
  }

  // 4. 운동인증 좋아요 취소(삭제)
  // DELETE : http://localhost:3000/like/workoutcert/:workoutcert_idx
  @Delete('/workoutcert/:workoutcert_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '운동인증 좋아요 취소(삭제)', 
    description: 'DELETE : http://localhost:3000/like/workoutcert/:workoutcert_idx' 
  })
  async deleteWorkoutCertLike(@Param('workoutcert_idx') workoutCertIdx: string, @User() user: UserAfterAuth): Promise<void> {
    await this.likeService.deleteWorkoutCertLike(workoutCertIdx, user.idx);
  }

  // 5. 댓글 좋아요 생성
  // POST : http://localhost:3000/like/comment
  @Post('comment')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '댓글 좋아요 생성', 
    description: 'POST : http://localhost:3000/like/comment' 
  })
  async createCommentLike(
    @Body() dto: CreateLikeReqDto,
    @User() user: UserAfterAuth,
  ): Promise<LikeResDto> {
    if (!dto.comment_idx) throw new Error('comment_idx 가 필요합니다.');
    return await this.likeService.createCommentLike(user.idx, dto.comment_idx);
  }

  // 6. 댓글 좋아요 수 확인
  // GET : http://localhost:3000/like/count/comment/:comment_idx
  @Get('count/comment/:comment_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
      summary: '댓글 좋아요 수 확인', 
      description: 'GET : http://localhost:3000/like/count/comment/:comment_idx' 
    })
  async getCommentLikeCount(@Param('comment_idx') commentIdx: string): Promise<LikeCountResDto> {
    const count = await this.likeService.getCommentLikeCount(commentIdx);
    return { count };
  }

  // 7. 댓글 좋아요 목록 확인 (누가 좋아요를 눌렀는지)
  // GET : http://localhost:3000/like/list/comment/:comment_idx
  @Get('list/comment/:comment_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
      summary: '댓글 좋아요 목록 확인 (누가 좋아요를 눌렀는지)', 
      description: 'GET : http://localhost:3000/like/list/comment/:comment_idx' 
    })
  async getLikesByComment(@Param('comment_idx') commentIdx: string): Promise<LikeResDto[]> {
    return await this.likeService.getLikesByComment(commentIdx);
  }

  // 8. 댓글 좋아요 취소(삭제)
  // DELETE : http://localhost:3000/like/comment/:comment_idx
  @Delete('comment/:comment_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
      summary: '댓글 좋아요 취소(삭제)', 
      description: 'DELETE : http://localhost:3000/like/comment/:comment_idx' 
    })
  async deleteCommentLike(@Param('comment_idx') commentIdx: string, @User() user: UserAfterAuth): Promise<void> {
    await this.likeService.deleteCommentLike(commentIdx, user.idx);
  }
}