import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from 'src/common/entities/like.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { User } from 'src/common/entities/user.entity';
import { Comment } from 'src/common/entities/comment.entity';
import { LikeResDto } from './dto/res.dto';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    @InjectRepository(WorkoutCert)
    private workoutCertRepository: Repository<WorkoutCert>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  // 1. 운동인증 좋아요 생성
  async createWorkoutCertLike(userIdx: string, workoutCertIdx: string): Promise<LikeResDto> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const workoutCert = await this.workoutCertRepository.findOne({ where: { idx: workoutCertIdx } });
    if (!workoutCert) throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

    const existingLike = await this.likeRepository.findOne({
      where: { user: { idx: userIdx }, workout_cert: { idx: workoutCertIdx } },
    });
    if (existingLike) throw new ConflictException('이미 좋아요를 눌렀습니다.');

    const like = this.likeRepository.create({
      user: { idx: userIdx },
      workout_cert: workoutCert,
    });

    const savedLike = await this.likeRepository.save(like);
    return { result: 'ok', idx: savedLike.idx, created_at: savedLike.created_at, user_idx: userIdx, workout_cert_idx: workoutCertIdx };
  }

  // 2. 운동인증 좋아요 수 확인
  async geteWorkoutCertLikeCount(workoutCertIdx: string): Promise<number> {
    const workoutCert = await this.workoutCertRepository.findOne({ where: { idx: workoutCertIdx } });
    if (!workoutCert) throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

    return await this.likeRepository.count({ where: { workout_cert: { idx: workoutCertIdx } } });
  }

  // 3. 운동인증 좋아요 목록 확인 (누가 좋아요를 눌렀는지)
  async getLikesByWorkoutCert(workoutCertIdx: string): Promise<LikeResDto[]> {
    const workoutCert = await this.workoutCertRepository.findOne({ where: { idx: workoutCertIdx } });
    if (!workoutCert) throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

    const likes = await this.likeRepository.find({
      where: { workout_cert: { idx: workoutCertIdx } },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });

    return likes.map(like => ({
      result: 'ok',
      idx: like.idx,
      created_at: like.created_at,
      user_idx: like.user.idx,
      workout_cert_idx: workoutCertIdx,
    }));
  }


  // 4. 운동인증 좋아요 취소(삭제)
  async deleteWorkoutCertLike(workoutCertIdx: string, userIdx: string): Promise<void> {
    const like = await this.likeRepository.findOne({
      where: { user: { idx: userIdx }, workout_cert: { idx: workoutCertIdx } },
    });
    if (!like) throw new NotFoundException('좋아요를 찾을 수 없습니다.');

    await this.likeRepository.remove(like);
  }

  // 5. 댓글 좋아요 생성
  async createCommentLike(userIdx: string, commentIdx: string): Promise<LikeResDto> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const comment = await this.commentRepository.findOne({ where: { idx: commentIdx } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');

    const existingLike = await this.likeRepository.findOne({
      where: { user: { idx: userIdx }, comment: { idx: commentIdx } },
    });
    if (existingLike) throw new ConflictException('이미 좋아요를 눌렀습니다.');

    const like = this.likeRepository.create({
      user,
      comment,
    });

    const savedLike = await this.likeRepository.save(like);
    return {
      result: 'ok',
      idx: savedLike.idx,
      created_at: savedLike.created_at,
      user_idx: userIdx,
      comment_idx: commentIdx,
    };
  }

  // 6. 댓글 좋아요 수 확인
  async getCommentLikeCount(commentIdx: string): Promise<number> {
    const comment = await this.commentRepository.findOne({ where: { idx: commentIdx } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');

    return await this.likeRepository.count({ where: { comment: { idx: commentIdx } } });
  }

  // 7. 댓글 좋아요 목록 확인 (누가 좋아요를 눌렀는지)
  async getLikesByComment(commentIdx: string): Promise<LikeResDto[]> {
    const comment = await this.commentRepository.findOne({ where: { idx: commentIdx } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');

    const likes = await this.likeRepository.find({
      where: { comment: { idx: commentIdx } },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });

    return likes.map((like) => ({
      result: 'ok',
      idx: like.idx,
      created_at: like.created_at,
      user_idx: like.user.idx,
      comment_idx: commentIdx,
    }));
  }

  // 8. 댓글 좋아요 취소(삭제)
  async deleteCommentLike(commentIdx: string, userIdx: string): Promise<void> {
    const like = await this.likeRepository.findOne({
      where: { user: { idx: userIdx }, comment: { idx: commentIdx } },
    });
    if (!like) throw new NotFoundException('좋아요를 찾을 수 없습니다.');

    await this.likeRepository.remove(like);
  }
}