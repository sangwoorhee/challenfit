import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { WorkoutCert } from 'src/common/entities/workout-cert.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengerStatus, ChallengeStatus } from 'src/common/enum/enum';
import { CreateWorkoutCertReqDto, UpdateWorkoutCertReqDto } from './dto/req.dto';

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
    private readonly dataSource: DataSource,
  ) {}

  // 1. 내가 참가한 모든 도전방에서의 인증글을 최신순으로 조회
  async getWorkoutCertsByUser(userIdx: string): Promise<WorkoutCert[]> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const certs = await this.workoutCertRepository.find({
      where: { user: { idx: userIdx } },
      order: { created_at: 'DESC' },
      relations: ['challenge_participant', 'challenge_participant.challenge'],
    });

    return certs;
  }

  // 2. 인증글 생성
  async createWorkoutCert(userIdx: string, dto: CreateWorkoutCertReqDto): Promise<WorkoutCert> {

  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const challengeRoom = await this.challengeRoomRepository.findOne({
      where: { idx: dto.challenge_room_idx, status: ChallengeStatus.ONGOING },
    });
    if (!challengeRoom) throw new NotFoundException('진행 중인 도전방을 찾을 수 없습니다.');

    const now = new Date();
    const startDate = challengeRoom.start_date ? new Date(challengeRoom.start_date) : null;
    const endDate = challengeRoom.end_date ? new Date(challengeRoom.end_date) : null;

    if (!startDate || !endDate || startDate > now || endDate < now) {
      throw new ForbiddenException('도전 기간 중에만 인증글을 올릴 수 있습니다.');
    }

    const participant = await this.participantRepository.findOne({
      where: {
        user: { idx: userIdx },
        challenge: { idx: dto.challenge_room_idx },
        status: ChallengerStatus.PARTICIPATING,
      },
    });
    if (!participant) throw new ForbiddenException('도전 참가자가 아닙니다.');

    // 현재 날짜의 자정과 다음 날 자정 계산 (한국 시간 기준)
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0); // 현재 날짜의 자정
    const nextDayMidnight = new Date(todayMidnight);
    nextDayMidnight.setDate(todayMidnight.getDate() + 1); // 다음 날 자정

    // 오늘 자정부터 다음 날 자정까지의 인증글 체크
    const existingCert = await this.workoutCertRepository.findOne({
      where: {
        challenge_participant: { idx: participant.idx },
        created_at: Between(todayMidnight, nextDayMidnight),
      },
    });
    if (existingCert) throw new ConflictException('오늘 자정 이후 이미 인증글을 올렸습니다. 다음 자정(00:00 KST)까지 기다려주세요.');

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

  // 3. 도전방의 인증글 목록 조회
  async getChallengeRoomWorkoutCerts(challengeRoomIdx: string): Promise<WorkoutCert[]> {
    const challengeRoom = await this.challengeRoomRepository.findOne({ where: { idx: challengeRoomIdx } });
    if (!challengeRoom) throw new NotFoundException('도전방을 찾을 수 없습니다.');

    return await this.workoutCertRepository.find({
      where: { challenge_participant: { challenge: { idx: challengeRoomIdx } } },
      relations: ['user', 'challenge_participant'],
      order: { created_at: 'DESC' },
    });
  }

  // 4. 인증글 단일 조회
  async getWorkoutCertDetail(idx: string): Promise<WorkoutCert> {
    const cert = await this.workoutCertRepository.findOne({
      where: { idx },
      relations: ['user', 'challenge_participant'],
    });
    if (!cert) throw new NotFoundException('인증글을 찾을 수 없습니다.');
    return cert;
  }

  // 5. 인증글 수정
  async updateWorkoutCert(idx: string, dto: UpdateWorkoutCertReqDto, user_idx: any): Promise<WorkoutCert> {
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
        const cert = await this.getWorkoutCertDetail(idx); 
        if (cert.user.idx !== user_idx) throw new ForbiddenException('자신의 인증글만 수정할 수 있습니다.');

        if (dto.image_url) cert.image_url = dto.image_url;
        if (dto.caption) cert.caption = dto.caption;
        if (dto.is_rest !== undefined) cert.is_rest = dto.is_rest;

        await queryRunner.commitTransaction();
        return await this.workoutCertRepository.save(cert);
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
    if (cert.user.idx !== user_idx) throw new ForbiddenException('자신의 인증글만 삭제할 수 있습니다.');
    await this.workoutCertRepository.remove(cert);
  }
}