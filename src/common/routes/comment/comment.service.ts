import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Comment } from 'src/common/entities/comment.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { User } from 'src/common/entities/user.entity';
import { Ranking } from 'src/common/entities/ranking.entity';
import { CreateCommentReqDto, UpdateCommentReqDto } from './dto/req.dto';
import { CommentResponseDto } from './dto/res.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(WorkoutCert)
    private workoutCertRepository: Repository<WorkoutCert>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Ranking)
    private rankingRepository: Repository<Ranking>,
    private dataSource: DataSource,
  ) {}

  // 1. 댓글 생성
  async createComment(
    userIdx: string,
    dto: CreateCommentReqDto,
  ): Promise<CommentResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({ 
        where: { idx: userIdx },
        relations: ['profile']
      });
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

      const workoutCert = await this.workoutCertRepository.findOne({
        where: { idx: dto.workout_cert_idx },
        relations: ['user']
      });
      if (!workoutCert)
        throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

      const comment = this.commentRepository.create({
        content: dto.content,
        user,
        workout_cert: workoutCert,
      });

      const savedComment = await queryRunner.manager.save(comment);

      // 운동인증 작성자의 포인트 10점 추가 (자기 자신의 글에는 포인트 추가 안 함)
      if (workoutCert.user.idx !== userIdx) {
        await this.updateUserPoints(queryRunner, workoutCert.user.idx, 10);
      }

      await queryRunner.commitTransaction();

      return {
        commentId: savedComment.idx,
        content: savedComment.content,
        createdAt: savedComment.created_at,
        userId: user.idx,
        nickname: user.nickname,
        profileImage: user.profile?.profile_image_url || null,
        postId: workoutCert.idx,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 댓글 수정
  async updateComment(
    commentIdx: string,
    userIdx: string,
    dto: UpdateCommentReqDto,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { idx: commentIdx },
      relations: ['user'],
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.user.idx !== userIdx)
      throw new ForbiddenException('자신의 댓글만 수정할 수 있습니다.');

    comment.content = dto.content;
    return await this.commentRepository.save(comment);
  }

  // 3. 댓글 단일 조회
  async getComment(commentIdx: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { idx: commentIdx },
      relations: ['user'],
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    return comment;
  }

  // 4. 댓글 목록 조회
  async getCommentsByWorkoutCert(
    workoutCertIdx: string,
  ): Promise<CommentResponseDto[]> {
    const workoutCert = await this.workoutCertRepository.findOne({
      where: { idx: workoutCertIdx },
    });
    if (!workoutCert)
      throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

    const comments = await this.commentRepository.find({
      where: { workout_cert: { idx: workoutCertIdx } },
      relations: ['user', 'user.profile'],
      order: { created_at: 'ASC' },
    });

    const response = comments.map((comment) => ({
      commentId: comment.idx,
      content: comment.content,
      createdAt: comment.created_at,
      userId: comment.user.idx,
      nickname: comment.user.nickname,
      profileImage: comment.user.profile?.profile_image_url || null,
      postId: workoutCert.idx,
    }));

    return response;
  }

  // 5. 댓글 삭제
  async deleteComment(commentIdx: string, userIdx: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const comment = await this.commentRepository.findOne({
        where: { idx: commentIdx },
        relations: ['user', 'workout_cert', 'workout_cert.user']
      });
      if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
      if (comment.user.idx !== userIdx)
        throw new ForbiddenException('자신의 댓글만 삭제할 수 있습니다.');

      // 운동인증 작성자의 포인트 10점 차감 (자기 자신의 글에는 포인트 차감 안 함)
      if (comment.workout_cert.user.idx !== userIdx) {
        await this.updateUserPoints(queryRunner, comment.workout_cert.user.idx, -10);
      }

      await queryRunner.manager.remove(comment);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 헬퍼 메서드: 사용자 포인트 업데이트 또는 생성
  private async updateUserPoints(queryRunner: any, userIdx: string, pointChange: number): Promise<void> {
    // 기존 랭킹 레코드 조회
    let ranking = await queryRunner.manager.findOne(Ranking, {
      where: { user_idx: userIdx }
    });

    if (ranking) {
      // 기존 레코드가 있으면 포인트 업데이트
      const newPoints = Math.max(0, ranking.points + pointChange); // 0점 미만으로 내려가지 않도록
      await queryRunner.manager.update(Ranking, 
        { user_idx: userIdx }, 
        { points: newPoints }
      );
    } else {
      // 기존 레코드가 없으면 새로 생성 (양수일 때만)
      if (pointChange > 0) {
        const newRanking = queryRunner.manager.create(Ranking, {
          user_idx: userIdx,
          points: pointChange,
          ranks: 0,
        });
        await queryRunner.manager.save(newRanking);
      }
    }
  }
}
