import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CertApproval } from 'src/common/entities/cert_approval.entity';
import { WorkoutCert } from 'src/common/entities/workout_cert.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { CreateCertApprovalReqDto } from './dto/req.dto';
import { ChallengerStatus } from 'src/common/enum/enum';
import { User } from 'src/common/entities/user.entity';

@Injectable()
export class WorkoutcertapprovalService {
  constructor(
    @InjectRepository(CertApproval)
    private approvalRepository: Repository<CertApproval>,
    @InjectRepository(WorkoutCert)
    private workoutCertRepository: Repository<WorkoutCert>,
    @InjectRepository(ChallengeParticipant)
    private participantRepository: Repository<ChallengeParticipant>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. 인증 승인 생성
  async createApproval(userIdx: string, dto: CreateCertApprovalReqDto): Promise<CertApproval> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 인증글 조회
      const cert = await this.workoutCertRepository.findOne({
        where: { idx: dto.workout_cert_idx },
        relations: ['challenge_participant', 'challenge_participant.challenge'],
      });
      if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
      if (cert.is_rest) throw new ForbiddenException('휴식일 인증글에는 승인을 생성할 수 없습니다.');

      // 사용자 도전 참여 확인
      const participant = await this.participantRepository.findOne({
        where: {
          user: { idx: userIdx },
          challenge: { idx: cert.challenge_participant.challenge.idx },
          status: ChallengerStatus.ONGOING,
        },
      });
      if (!participant) throw new ForbiddenException('도전 참가자가 아닙니다.');

      // 승인 생성
      const approval = this.approvalRepository.create({
        user: { idx: userIdx } as User,
        workout_cert: { idx: dto.workout_cert_idx } as WorkoutCert,
        challenge_participant: { idx: participant.idx } as ChallengeParticipant,
      });
      const savedApproval = await queryRunner.manager.save(approval);

      // 승인 수 체크 및 인증 완료 처리
      const approvalCount = await this.approvalRepository.count({
        where: { workout_cert: { idx: dto.workout_cert_idx } },
      });
      if (approvalCount >= cert.target_approval_count && !cert.is_completed) {
        cert.is_completed = true;
        await queryRunner.manager.save(cert);
      }

      await queryRunner.commitTransaction();
      return savedApproval;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 인증 승인 목록 조회
  async getApprovalsByCert(workoutCertIdx: string): Promise<CertApproval[]> {
    const cert = await this.workoutCertRepository.findOne({
      where: { idx: workoutCertIdx },
    });
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');

    return await this.approvalRepository.find({
      where: { workout_cert: { idx: workoutCertIdx } },
      relations: ['user', 'challenge_participant'],
      order: { created_at: 'DESC' },
    });
  }
}
