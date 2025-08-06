import { ApiProperty } from '@nestjs/swagger';
import { Comment } from 'src/common/entities/comment.entity';

// export class CreateCommentResDto {
//   @ApiProperty({ description: '결과' })
//   result: string;

//   @ApiProperty({ description: '생성된 댓글' })
//   comment: Comment;
// }

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
  @ApiProperty({ description: '댓글 ID' })
  commentId: string;
  
  @ApiProperty({ description: '댓글 내용' })
  content: string;
  
  @ApiProperty({ description: '생성일시' })
  createdAt: Date;
  
  @ApiProperty({ description: '사용자 ID' })
  userId: string;
  
  @ApiProperty({ description: '닉네임' })
  nickname: string;
  
  @ApiProperty({ description: '프로필 이미지 URL' })
  profileImage: string | null;
  
  @ApiProperty({ description: '게시물 ID' })
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
