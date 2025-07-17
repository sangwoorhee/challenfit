import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  // 1. 내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회
  async getWorkoutCertsByUser(
    userIdx: string,
    page: number,
    size: number,
  ): Promise<PageResDto<WorkoutCert>> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const [certs, totalCount] = await this.workoutCertRepository.findAndCount({
      where: { user: { idx: userIdx } },
      order: { created_at: 'DESC' },
      relations: [
        'challenge_participant',
        'challenge_participant.challenge',
        'cert_approval',
      ],
      skip: (page - 1) * size,
      take: size,
    });

    return {
      page,
      size,
      totalCount,
      items: certs,
    };
  }

  // 2. 인증글 생성
  async createWorkoutCert(
    userIdx: string,
    dto: CreateWorkoutCertWithImageDto,
  ): Promise<WorkoutCert> {
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

      // challenge_participant를 직접 조회하고 관련 challenge도 함께 가져오기
      const participant = await this.participantRepository.findOne({
        where: {
          idx: dto.challenge_participant_idx,
          user: { idx: userIdx },
          status: ChallengerStatus.ONGOING,
        },
        relations: ['challenge'],
      });
      if (!participant)
        throw new ForbiddenException(
          '참가자 정보를 찾을 수 없거나 참가 중이 아닙니다.',
        );

      const challengeRoom = participant.challenge;
      if (challengeRoom.status !== ChallengeStatus.ONGOING) {
        throw new NotFoundException('진행 중인 도전방이 아닙니다.');
      }

      const now = new Date();
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

      // 현재 날짜의 자정과 다음 날 자정 계산 (한국 시간 기준)
      const todayMidnight = new Date(now);
      todayMidnight.setHours(0, 0, 0, 0);
      const nextDayMidnight = new Date(todayMidnight);
      nextDayMidnight.setDate(todayMidnight.getDate() + 1);

      // 오늘 자정부터 다음 날 자정까지의 인증글 체크
      const existingCert = await this.workoutCertRepository.findOne({
        where: {
          challenge_participant: { idx: participant.idx },
          created_at: Between(todayMidnight, nextDayMidnight),
        },
      });
      if (existingCert)
        throw new ConflictException(
          '오늘 자정 이후 이미 인증글을 올렸습니다. 다음 자정(00:00 KST)까지 기다려주세요.',
        );

      const workoutCert = this.workoutCertRepository.create({
        user,
        challenge_participant: participant,
        image_url: dto.image_url,
        caption: dto.caption,
        is_rest: dto.is_rest,
        target_approval_count: dto.target_approval_count,
        is_completed: false,
      });

      const savedCert = await this.workoutCertRepository.save(workoutCert);
      await queryRunner.commitTransaction();
      return savedCert;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 도전의 인증글 목록 조회
  async getChallengeRoomWorkoutCerts(
    challengeParticipantIdx: string,
  ): Promise<WorkoutCert[]> {
    const challengeRoom = await this.participantRepository.findOne({
      where: { idx: challengeParticipantIdx },
    });
    if (!challengeRoom)
      throw new NotFoundException('도전방을 찾을 수 없습니다.');

    return await this.workoutCertRepository.find({
      where: {
        challenge_participant: { idx: challengeParticipantIdx },
      },
      relations: ['user', 'challenge_participant', 'cert_approval'],
      order: { created_at: 'DESC' },
    });
  }

  // 4. 인증글 단일 조회
  async getWorkoutCertDetail(idx: string): Promise<WorkoutCert> {
    const cert = await this.workoutCertRepository.findOne({
      where: { idx },
      relations: ['user', 'challenge_participant', 'cert_approval'],
    });
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
    return cert;
  }

  // 5. 인증글 수정 (이미지 파일 처리 포함)
  async updateWorkoutCert(
    idx: string,
    dto: UpdateWorkoutCertWithImageDto,
    user_idx: any,
  ): Promise<WorkoutCert> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const cert = await this.getWorkoutCertDetail(idx);
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
      return updatedCert;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 6. 인증글 삭제
  async deleteWorkoutCert(idx: string, user_idx: any): Promise<void> {
    const cert = await this.getWorkoutCertDetail(idx);
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
  ): Promise<PageResDto<WorkoutCert>> {
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
      relations: ['challenge_participant', 'challenge_participant.challenge', 'cert_approval'],
      skip: (page - 1) * size,
      take: size,
    });

    return {
      page,
      size,
      totalCount,
      items: certs,
    };
  }

  // 9. 모든 인증글을 최신순으로 조회
  async getWorkoutCerts(): Promise<WorkoutCert[]> {
    const certs = await this.workoutCertRepository.find({
      order: { created_at: 'DESC' },
      relations: ['user', 'user.profile'],
    });

    return certs;
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
}
