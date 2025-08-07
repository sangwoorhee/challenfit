import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Like } from 'src/common/entities/like.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { User } from 'src/common/entities/user.entity';
import { Comment } from 'src/common/entities/comment.entity';
import { Ranking } from 'src/common/entities/ranking.entity';
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
    @InjectRepository(Ranking)
    private rankingRepository: Repository<Ranking>,
    private dataSource: DataSource,
  ) {}

  // 1. 운동인증 좋아요 생성
  async createWorkoutCertLike(userIdx: string, workoutCertIdx: string): Promise<LikeResDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({ where: { idx: userIdx } });
      if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

      const workoutCert = await this.workoutCertRepository.findOne({ 
        where: { idx: workoutCertIdx },
        relations: ['user']
      });
      if (!workoutCert) throw new NotFoundException('운동 인증을 찾을 수 없습니다.');

      const existingLike = await this.likeRepository.findOne({
        where: { user: { idx: userIdx }, workout_cert: { idx: workoutCertIdx } },
      });
      if (existingLike) throw new ConflictException('이미 좋아요를 눌렀습니다.');

      const like = this.likeRepository.create({
        user: { idx: userIdx },
        workout_cert: workoutCert,
      });

      const savedLike = await queryRunner.manager.save(like);

      // 운동인증 작성자의 포인트 5점 추가 (자기 자신의 글에는 포인트 추가 안 함)
      if (workoutCert.user.idx !== userIdx) {
        await this.updateUserPoints(queryRunner, workoutCert.user.idx, 5);
      }

      await queryRunner.commitTransaction();
      
      return { 
        result: 'ok', 
        idx: savedLike.idx, 
        created_at: savedLike.created_at, 
        user_idx: userIdx, 
        workout_cert_idx: workoutCertIdx 
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const like = await this.likeRepository.findOne({
        where: { user: { idx: userIdx }, workout_cert: { idx: workoutCertIdx } },
        relations: ['workout_cert', 'workout_cert.user']
      });
      if (!like) throw new NotFoundException('좋아요를 찾을 수 없습니다.');

      // 운동인증 작성자의 포인트 5점 차감 (자기 자신의 글에는 포인트 차감 안 함)
      if (like.workout_cert.user.idx !== userIdx) {
        await this.updateUserPoints(queryRunner, like.workout_cert.user.idx, -5);
      }

      await queryRunner.manager.remove(like);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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