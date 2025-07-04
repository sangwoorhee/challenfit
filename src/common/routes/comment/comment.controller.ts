import { Controller, Post, Patch, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { JwtAuthGuard } from 'src/common/guard/jwt-auth.guard';
import { User, UserAfterAuth } from 'src/common/decorators/user.decorator';
import { CreateCommentReqDto, UpdateCommentReqDto } from './dto/req.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Comment } from 'src/common/entities/comment.entity';

@ApiTags('댓글')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // 1. 댓글 생성
  // POST: http://localhost:3000/comment
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '댓글 생성', 
    description: 'POST: http://localhost:3000/comment' 
  })
  async createComment(
    @Body() dto: CreateCommentReqDto,
    @User() user: UserAfterAuth,
  ): Promise<Comment> {
    return await this.commentService.createComment(user.idx, dto);
  }

  // 2. 댓글 수정
  // PATCH: http://localhost:3000/comment/:comment_idx
  @Patch(':comment_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '댓글 수정', 
    description: 'PATCH: http://localhost:3000/comment/:comment_idx' 
  })
  async updateComment(
    @Param('comment_idx') commentIdx: string,
    @Body() dto: UpdateCommentReqDto,
    @User() user: UserAfterAuth,
  ): Promise<Comment> {
    return await this.commentService.updateComment(commentIdx, user.idx, dto);
  }

  // 3. 댓글 단일 조회
  // GET: http://localhost:3000/comment/:comment_idx
  @Get(':comment_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '댓글 수정', 
    description: 'GET: http://localhost:3000/comment/:comment_idx' 
  })
  @ApiOperation({ summary: '댓글 조회', description: 'GET: /comment/:comment_idx' })
  async getComment(@Param('comment_idx') commentIdx: string): Promise<Comment> {
    return await this.commentService.getComment(commentIdx);
  }

  // 4. 댓글 목록 조회
  // GET: http://localhost:3000/comment/workoutcert/:workoutcert_idx
  @Get('workoutcert/:workoutcert_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '댓글 목록 조회', 
    description: 'GET: http://localhost:3000/comment/workoutcert/:workoutcert_idx' 
  })
  @ApiOperation({ summary: '댓글 목록 조회', description: 'GET: /comment/workoutcert/:workoutcert_idx' })
  async getCommentsByWorkoutCert(@Param('workoutcert_idx') workoutCertIdx: string): Promise<Comment[]> {
    return await this.commentService.getCommentsByWorkoutCert(workoutCertIdx);
  }

  // 5. 댓글 삭제
  // DELETE: http://localhost:3000/comment/:comment_idx
  @Delete(':comment_idx')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: '댓글 삭제', 
    description: 'DELETE: http://localhost:3000/comment/:comment_idx' 
  })
  async deleteComment(@Param('comment_idx') commentIdx: string, @User() user: UserAfterAuth): Promise<void> {
    await this.commentService.deleteComment(commentIdx, user.idx);
  }
}