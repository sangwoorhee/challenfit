import { ApiProperty } from '@nestjs/swagger';
import { Comment } from 'src/common/entities/comment.entity';

export class CreateCommentResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '생성된 댓글' })
  comment: Comment;
}

export class UpdateCommentResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '수정된 댓글' })
  comment: Comment;
}

export class GetCommentResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '댓글' })
  comment: Comment;
}

export class CommentResponseDto {
  commentId: string;
  content: string;
  createdAt: Date;
  userId: string;
  nickname: string;
  profileImage: string | null;
  postId: string;
}

export class GetCommentsByWorkoutCertResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({
    description: '댓글 목록',
    type: [CommentResponseDto],
  })
  comments: CommentResponseDto[];
}
export class DeleteCommentResDto {
  @ApiProperty({ description: '결과' })
  result: string;
}
