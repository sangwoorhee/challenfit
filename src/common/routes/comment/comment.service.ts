import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from 'src/common/entities/comment.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { User } from 'src/common/entities/user.entity';
import { CreateCommentReqDto, UpdateCommentReqDto } from './dto/req.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(WorkoutCert)
    private workoutCertRepository: Repository<WorkoutCert>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 1. 댓글 생성
  async createComment(userIdx: string, dto: CreateCommentReqDto): Promise<Comment> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const workoutCert = await this.workoutCertRepository.findOne({ where: { idx: dto.workout_cert_idx } });
    if (!workoutCert) throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

    const comment = this.commentRepository.create({
      content: dto.content,
      user,
      workout_cert: workoutCert,
    });

    return await this.commentRepository.save(comment);
  }

  // 2. 댓글 수정
  async updateComment(commentIdx: string, userIdx: string, dto: UpdateCommentReqDto): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ where: { idx: commentIdx }, relations: ['user'] });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.user.idx !== userIdx) throw new ForbiddenException('자신의 댓글만 수정할 수 있습니다.');

    comment.content = dto.content;
    return await this.commentRepository.save(comment);
  }

  // 3. 댓글 단일 조회
  async getComment(commentIdx: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({ 
        where: { idx: commentIdx }, 
        relations: ['user'] 
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    return comment;
  }

  // 4. 댓글 목록 조회
  async getCommentsByWorkoutCert(workoutCertIdx: string): Promise<Comment[]> {
    const workoutCert = await this.workoutCertRepository.findOne({ where: { idx: workoutCertIdx } });
    if (!workoutCert) throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

    return await this.commentRepository.find({
      where: { workout_cert: { idx: workoutCertIdx } },
      relations: ['user', 'user.profile'], // profile 관계 추가
      order: { created_at: 'ASC' },
    });
  }

  // 5. 댓글 삭제
  async deleteComment(commentIdx: string, userIdx: string): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { idx: commentIdx }, relations: ['user'] });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.user.idx !== userIdx) throw new ForbiddenException('자신의 댓글만 삭제할 수 있습니다.');

    await this.commentRepository.remove(comment);
  }
}