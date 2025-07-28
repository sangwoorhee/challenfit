import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengerStatus, ChallengeStatus } from 'src/common/enum/enum';
import {
  CreateWorkoutCertReqDto,
  UpdateWorkoutCertReqDto,
} from './dto/req.dto';
import { CertApproval } from 'src/common/entities/cert_approval.entity';
import * as fs from 'fs';
import * as path from 'path';
import { PageResDto } from 'src/common/dto/res.dto';
import { Follow } from 'src/common/entities/follow.entity';
import { PageWithUserStatsResDto, UserStatsDto, WorkoutCertDetailDto, WorkoutCertResDto, WorkoutCertWithStatsDto } from './dto/res.dto';

// 확장된 DTO 타입 (내부에서만 사용)
interface CreateWorkoutCertWithImageDto extends CreateWorkoutCertReqDto {
  image_url: string;
}

interface UpdateWorkoutCertWithImageDto extends UpdateWorkoutCertReqDto {
  image_url?: string;
}

@Injectable()
export class WorkoutcertService {
  constructor(
    @InjectRepository(WorkoutCert)
    private workoutCertRepository: Repository<WorkoutCert>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ChallengeParticipant)
    private participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(ChallengeRoom)
    private challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(CertApproval)
    private certApprovalRepository: Repository<CertApproval>,
    @InjectRepository(Follow)
    private followRepository: Repository<Follow>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. 내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회
  async getWorkoutCertsByUser(
    userIdx: string,
    page: number,
    size: number,
  ): Promise<PageResDto<WorkoutCertWithStatsDto>> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
      where: { user: { idx: userIdx } },
      order: { created_at: 'DESC' },
      relations: [
        'user',
        'user.profile',
        'challenge_participant',
        'challenge_participant.challenge',
        'cert_approval',
        'likes',
        'likes.user',
        'comments',
        'comments.user',
      ],
      skip: (page - 1) * size,
      take: size,
    });

    const enrichedCerts = await this.enrichWorkoutCerts(certs, userIdx);

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      items: enrichedCerts,
    };
  }

  // 2. 인증글 생성 (이미지 업로드 포함)
  async createWorkoutCert(
    userIdx: string,
    dto: CreateWorkoutCertWithImageDto,
  ): Promise<WorkoutCertResDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await this.userRepository.findOne({
        where: { idx: userIdx },
      });
      if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

      // 사용자의 참여 중인 도전 조회
      const ongoingParticipants = await this.participantRepository.find({
        where: {
          user: { idx: userIdx },
          status: ChallengerStatus.ONGOING,
        },
        relations: ['challenge'],
      });

      // 진행 중인 도전이 있는지 확인
      const ongoingChallenges = ongoingParticipants.filter(
        (participant) => participant.challenge.status === ChallengeStatus.ONGOING,
      );

      if (ongoingChallenges.length === 0) {
        throw new ForbiddenException('진행 중인 도전이 없습니다. 인증글을 생성할 수 없습니다.');
      }

      // 현재 날짜의 자정과 다음 날 자정 계산 (한국 시간 기준)
      const now = new Date();
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      const nextDayMidnight = new Date(todayMidnight);
      nextDayMidnight.setDate(todayMidnight.getDate() + 1);

      // 오늘 인증글을 올리지 않은 도전 찾기
      let selectedParticipant: ChallengeParticipant | null = null;
      
      for (const participant of ongoingChallenges) {
        const existingCert = await this.workoutCertRepository.findOne({
          where: {
            challenge_participant: { idx: participant.idx },
            created_at: Between(todayMidnight, nextDayMidnight),
          },
        });
        
        if (!existingCert) {
          selectedParticipant = participant;
          break;
        }
      }

      if (!selectedParticipant) {
        throw new ConflictException(
          '모든 진행 중인 도전에서 오늘 이미 인증글을 올렸습니다. 다음 자정(00:00 KST)까지 기다려주세요.',
        );
      }

      const challengeRoom = selectedParticipant.challenge;
      const startDate = challengeRoom.start_date
        ? new Date(challengeRoom.start_date)
        : null;
      const endDate = challengeRoom.end_date
        ? new Date(challengeRoom.end_date)
        : null;

      if (!startDate || !endDate || startDate > now || endDate < now) {
        throw new ForbiddenException(
          '도전 기간 중에만 인증글을 올릴 수 있습니다.',
        );
      }

      const workoutCert = this.workoutCertRepository.create({
        user,
        challenge_participant: selectedParticipant,
        image_url: dto.image_url,
        caption: dto.caption,
        is_rest: dto.is_rest,
        target_approval_count: dto.target_approval_count,
        is_completed: false,
      });

      const savedCert = await this.workoutCertRepository.save(workoutCert);
      await queryRunner.commitTransaction();
      
      return {
        result: 'ok',
        workoutCert: savedCert,
        selected_challenge_participant_idx: selectedParticipant.idx,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 내가 팔로우하는 유저들의 인증글 조회 (페이지네이션)
  async getFollowingUsersWorkoutCerts(
    userIdx: string,
    page: number,
    size: number,
  ): Promise<PageResDto<WorkoutCertWithStatsDto>> {
    // 현재 유저가 팔로우하는 유저들의 idx 목록을 먼저 조회
    const followingRelations = await this.followRepository.find({
      where: { follower: { idx: userIdx } },
      relations: ['following'],
      select: {
        following: { idx: true },
      },
    });  
  
    // 팔로우하는 유저들의 idx 배열 생성
    const followingUserIds = followingRelations.map(
      (relation) => relation.following.idx,
    );

    // 자신의 idx도 포함
    followingUserIds.push(userIdx);
  
    // 팔로우하는 유저가 없는 경우에도 자신의 인증글은 조회
  const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
    where: {
      user: {
        idx: In(followingUserIds),
      },
    },
    order: { created_at: 'DESC' },
    relations: [
      'user',
      'user.profile',
      'challenge_participant',
      'challenge_participant.challenge',
      'cert_approval',
      'likes',
      'likes.user',
      'comments',
      'comments.user',
    ],
    skip: (page - 1) * size,
    take: size,
  });

  // 각 인증글에 대한 추가 정보 계산
  const enrichedCerts = await this.enrichWorkoutCerts(certs, userIdx);

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      items: enrichedCerts,
    };
  }

  // 4. 도전의 인증글 목록 조회 (페이지네이션 추가)
  async getChallengeRoomWorkoutCerts(
    challengeParticipantIdx: string,
    page: number,
    size: number,
    currentUserIdx?: string,
  ): Promise<PageResDto<WorkoutCertWithStatsDto>> {
    const challengeRoom = await this.participantRepository.findOne({
      where: { idx: challengeParticipantIdx },
    });
    if (!challengeRoom)
      throw new NotFoundException('도전방을 찾을 수 없습니다.');

    const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
      where: {
        challenge_participant: { idx: challengeParticipantIdx },
      },
      relations: [
        'user',
        'user.profile',
        'challenge_participant',
        'cert_approval',
        'likes',
        'likes.user',
        'comments',
        'comments.user',
      ],
      order: { created_at: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    const enrichedCerts = await this.enrichWorkoutCerts(certs, currentUserIdx);

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      items: enrichedCerts,
    };
  }

  // 5. 인증글 단일 조회
  async getWorkoutCertDetail(
    idx: string,
    currentUserIdx?: string,
  ): Promise<WorkoutCertDetailDto> {
    const cert = await this.workoutCertRepository.findOne({
      where: { idx },
      relations: [
        'user',
        'user.profile',
        'challenge_participant',
        'challenge_participant.challenge',
        'cert_approval',
        'likes',
        'likes.user',
        'comments',
        'comments.user',
      ],
    });
    
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
    
    // 단일 조회용 DTO 형식으로 변환
    const detailDto: WorkoutCertDetailDto = {
      idx: cert.idx,
      image_url: cert.image_url,
      caption: cert.caption,
      is_rest: cert.is_rest,
      target_approval_count: cert.target_approval_count,
      is_completed: cert.is_completed,
      created_at: cert.created_at,
      like_count: cert.likes?.length || 0,
      comment_count: cert.comments?.length || 0,
      is_liked: currentUserIdx
        ? cert.likes?.some((like) => like.user?.idx === currentUserIdx) || false
        : false,
      is_commented: currentUserIdx
        ? cert.comments?.some((comment) => comment.user?.idx === currentUserIdx) || false
        : false,
      user: {
        idx: cert.user.idx,
        nickname: cert.user.nickname,
        name: cert.user.name,
        profile: cert.user.profile ? {
          profile_image_url: cert.user.profile.profile_image_url,
        } : undefined,
      },
      challenge_participant: cert.challenge_participant,
    };
    
    return detailDto;
  }

  // 6. 인증글 수정 (이미지 업로드 포함)
  async updateWorkoutCert(
    idx: string,
    dto: UpdateWorkoutCertWithImageDto,
    user_idx: any,
  ): Promise<WorkoutCertResDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cert = await this.workoutCertRepository.findOne({
        where: { idx },
        relations: ['user'],
      });
      if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
      if (cert.user.idx !== user_idx)
        throw new ForbiddenException('자신의 인증글만 수정할 수 있습니다.');

      // 새로운 이미지가 업로드된 경우 기존 이미지 파일 삭제
      if (dto.image_url && cert.image_url !== dto.image_url) {
        this.deleteImageFile(cert.image_url);
        cert.image_url = dto.image_url;
      }

      if (dto.caption) cert.caption = dto.caption;
      if (dto.is_rest !== undefined) cert.is_rest = dto.is_rest;

      const updatedCert = await this.workoutCertRepository.save(cert);
      await queryRunner.commitTransaction();
      
      return {
        result: 'ok',
        workoutCert: updatedCert,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 7. 인증글 삭제
  async deleteWorkoutCert(idx: string, user_idx: any): Promise<void> {
    const cert = await this.workoutCertRepository.findOne({
      where: { idx },
      relations: ['user'],
    });
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
    if (cert.user.idx !== user_idx)
      throw new ForbiddenException('자신의 인증글만 삭제할 수 있습니다.');

    // 이미지 파일 삭제
    this.deleteImageFile(cert.image_url);

    await this.workoutCertRepository.remove(cert);
  }

  // 8. 유저의 도전 운동 인증 목록 조회 (페이지네이션)
  async getWorkoutCertsByUserAndChallengeParticipant(
    userIdx: string,
    challengeParticipantIdx: string,
    page: number,
    size: number,
    currentUserIdx?: string,
  ): Promise<PageResDto<WorkoutCertWithStatsDto>> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const participant = await this.participantRepository.findOne({
      where: { idx: challengeParticipantIdx, user: { idx: userIdx } },
    });
    if (!participant) throw new NotFoundException('참가자 정보를 찾을 수 없습니다.');

    const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
      where: {
        user: { idx: userIdx },
        challenge_participant: { idx: challengeParticipantIdx },
      },
      order: { created_at: 'DESC' },
      relations: [
        'user',
        'user.profile',
        'challenge_participant',
        'challenge_participant.challenge',
        'cert_approval',
        'likes',
        'likes.user',
        'comments',
        'comments.user',
      ],
      skip: (page - 1) * size,
      take: size,
    });

    const enrichedCerts = await this.enrichWorkoutCerts(certs, currentUserIdx);

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      items: enrichedCerts,
    };
  }

  // 9, 10. 특정 유저, 나의 모든 운동 인증 목록과 통계 정보 조회
  async getMyWorkoutCertsWithStats(
    userIdx: string,
    page: number,
    size: number,
    currentUserIdx?: string,
  ): Promise<PageWithUserStatsResDto<WorkoutCertWithStatsDto>> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');
  
    const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
      where: { user: { idx: userIdx } },
      order: { created_at: 'DESC' },
      relations: [
        'user',
        'user.profile',
        'challenge_participant',
        'challenge_participant.challenge',
        'cert_approval',
        'likes',
        'likes.user',
        'comments',
        'comments.user',
      ],
      skip: (page - 1) * size,
      take: size,
    });
  
    const enrichedCerts = await this.enrichWorkoutCerts(certs, currentUserIdx || userIdx);
  
    // 유저의 전체 운동인증 게시글 수 조회
    const workoutCertCount = await this.workoutCertRepository.count({
      where: { user: { idx: userIdx } },
    });
  
    const userStats: UserStatsDto = {
      workout_cert_count: workoutCertCount,
      follower_count: user.follower_count,
      following_count: user.following_count,
    };
  
    return {
      result: 'ok',
      page,
      size,
      totalCount,
      items: enrichedCerts,
      userStats,
    };
  }

  // 11. 모든 인증글을 최신순으로 조회 (페이지네이션 추가)
  async getWorkoutCerts(
    page: number,
    size: number,
    currentUserIdx?: string,
  ): Promise<PageResDto<WorkoutCertWithStatsDto>> {
    const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
      order: { created_at: 'DESC' },
      relations: [
        'user',
        'user.profile',
        'challenge_participant',
        'challenge_participant.challenge',
        'likes',
        'likes.user',
        'comments',
        'comments.user',
      ],
      skip: (page - 1) * size,
      take: size,
    });

    const enrichedCerts = await this.enrichWorkoutCerts(certs, currentUserIdx);

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      items: enrichedCerts,
    };
  }

  // -------------------------------------- 헬퍼 메서드: 이미지 파일 삭제
  private deleteImageFile(imageUrl: string): void {
    try {
      if (imageUrl && imageUrl.startsWith('/uploads/workout-images/')) {
        const filename = imageUrl.split('/').pop();
        if (!filename) return;
        const filePath = path.join(
          process.cwd(),
          'uploads',
          'workout-images',
          filename,
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('이미지 파일 삭제 중 오류:', error);
      // 파일 삭제 실패는 전체 프로세스를 중단시키지 않음
    }
  }

  // 헬퍼 메서드: WorkoutCert에 좋아요/댓글 정보 추가
  private async enrichWorkoutCerts(
    certs: WorkoutCert[],
    currentUserIdx?: string,
  ): Promise<WorkoutCertWithStatsDto[]> {
    // 모든 도전방 ID 수집
    const challengeIds = [...new Set(
      certs
        .filter(cert => cert.challenge_participant?.challenge?.idx)
        .map(cert => cert.challenge_participant.challenge.idx)
    )];
  
    // 현재 사용자가 참여 중인 도전방 한 번에 조회
    let userChallenges: string[] = [];
    if (currentUserIdx && challengeIds.length > 0) {
      const participants = await this.participantRepository.find({
        where: {
          user: { idx: currentUserIdx },
          challenge: { idx: In(challengeIds) },
          status: ChallengerStatus.ONGOING,
        },
        select: ['challenge'],
      });
      userChallenges = participants.map(p => p.challenge.idx);
    }
  
    return certs.map((cert) => ({
      ...cert,
      like_count: cert.likes?.length || 0,
      comment_count: cert.comments?.length || 0,
      is_liked: currentUserIdx
        ? cert.likes?.some((like) => like.user?.idx === currentUserIdx) || false
        : false,
      is_commented: currentUserIdx
        ? cert.comments?.some((comment) => comment.user?.idx === currentUserIdx) || false
        : false,
      is_same_challenge_participant: cert.challenge_participant?.challenge?.idx
        ? userChallenges.includes(cert.challenge_participant.challenge.idx)
        : false,
    }));
  }
}
