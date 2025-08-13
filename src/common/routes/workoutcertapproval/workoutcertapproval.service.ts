import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
  async createApproval(
    userIdx: string,
    dto: CreateCertApprovalReqDto,
  ): Promise<CertApproval> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 인증글 조회 - 도전방의 모든 참가자 정보를 포함하여 조회
      const cert = await this.workoutCertRepository.findOne({
        where: { idx: dto.workout_cert_idx },
        relations: [
          'challenge_participant',
          'challenge_participant.challenge',
          'challenge_participant.challenge.challenge_participants',
        ],
      });
      if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
      // if (cert.is_rest) throw new ForbiddenException('휴식일 인증글에는 승인을 생성할 수 없습니다.');

      // 사용자 도전 참여 확인
      const participant = await this.participantRepository.findOne({
        where: {
          user: { idx: userIdx },
          challenge: { idx: cert.challenge_participant.challenge.idx },
          status: ChallengerStatus.ONGOING,
        },
      });
      if (!participant) throw new ForbiddenException('도전 참가자가 아닙니다.');

      // if (cert.challenge_participant && cert.challenge_participant.challenge) {
      //   const challengeRoom = cert.challenge_participant.challenge;

      //   // challenge_participants가 로드되어 있으면 정확한 카운트 사용
      //   if (challengeRoom.challenge_participants) {
      //     // ONGOING 또는 PENDING 상태의 참가자만 카운트
      //     const activeParticipants =
      //       challengeRoom.challenge_participants.filter(
      //         (participant) =>
      //           participant.status === ChallengerStatus.ONGOING ||
      //           participant.status === ChallengerStatus.PENDING,
      //       );
      //     dynamicTargetApprovalCount = activeParticipants.length - 1;
      //   } else {
      //     // challenge_participants가 로드되지 않았으면 current_participants 사용
      //     dynamicTargetApprovalCount = challengeRoom.current_participants - 1;
      //   }
      // }

      // 승인 생성
      const approval = new CertApproval();
      approval.user = { idx: userIdx } as User;
      approval.workout_cert = { idx: dto.workout_cert_idx } as WorkoutCert;
      approval.challenge_participant = {
        idx: participant.idx,
      } as ChallengeParticipant;
      approval.stamp_img = dto.stamp_img;

      const savedApproval = await queryRunner.manager.save(approval);

      // 기존 스탬프 개수에 1개 추가
      const approvalCount =
        (await this.approvalRepository.count({
          where: { workout_cert: { idx: dto.workout_cert_idx } },
        })) + 1;

      console.log(
        `인증글 ${dto.workout_cert_idx}: 현재 승인 수 ${approvalCount}, 목표 승인 수 ${cert.target_approval_count}`,
      );

      if (approvalCount >= cert.target_approval_count && !cert.is_completed) {
        cert.is_completed = true;
        await queryRunner.manager.save(cert);
        console.log(`인증글 ${dto.workout_cert_idx} 완료 처리됨`);
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
  async getApprovalsByCert(workoutCertIdx: string): Promise<any[]> {
    const cert = await this.workoutCertRepository.findOne({
      where: { idx: workoutCertIdx },
    });
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');

    const approvals = await this.approvalRepository.find({
      where: { workout_cert: { idx: workoutCertIdx } },
      relations: ['user', 'user.profile', 'challenge_participant'],
      order: { created_at: 'DESC' },
    });

    // 필요한 데이터만 추출하여 반환
    return approvals.map((approval) => ({
      idx: approval.idx,
      created_at: approval.created_at,
      stamp_img: approval.stamp_img,
      user: {
        idx: approval.user.idx,
        nickname: approval.user.nickname,
      },
    }));
  }
}
