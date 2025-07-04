import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengerStatus, ChallengeStatus, DurationUnit } from 'src/common/enum/enum';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ChallengeparticipantService {
  constructor(
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(ChallengeRoom)
    private readonly challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

   // 1. 도전방 입장
  async enterChallengeRoom(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
    const challengeRoom = await this.challengeRoomRepository.findOne({
      where: { idx: challengeRoomIdx },
      relations: ['challenge_participants'],
    });

    if (!challengeRoom || !challengeRoom.is_public) {
      throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
    }

    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const existingParticipant = await this.participantRepository.findOne({
      where: { user: { idx: userIdx }, challenge: { idx: challengeRoomIdx } },
    });

    if (existingParticipant) {
      return existingParticipant; // 이미 입장한 경우 기존 참가자 정보 반환
    }

    const participant = this.participantRepository.create({
      user,
      challenge: challengeRoom,
      status: ChallengerStatus.PENDING, // 입장만 한 상태
      joined_at: new Date(),
      completed_at: null,
    });

    await queryRunner.commitTransaction();
    return await this.participantRepository.save(participant);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`)
      throw new InternalServerErrorException(`도전 방 입장 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 도전 참가
  async participateChallengeRoom(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
    const challengeRoom = await this.challengeRoomRepository.findOne({
      where: { idx: challengeRoomIdx },
      relations: ['challenge_participants'],
    });

    if (!challengeRoom || !challengeRoom.is_public) {
      throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
    }

    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const existingParticipant = await this.participantRepository.findOne({
      where: { user: { idx: userIdx }, challenge: { idx: challengeRoomIdx } },
    });

    if (!existingParticipant) {
      throw new NotFoundException('먼저 도전방에 입장해야 합니다.');
    }

    if (existingParticipant.status === ChallengerStatus.PARTICIPATING) {
      throw new ConflictException('이미 도전에 참가했습니다.');
    }

    // 현재 참가자 상태를 PARTICIPATING으로 변경
    existingParticipant.status = ChallengerStatus.PARTICIPATING;
    // completed_at은 나중에 스케줄러에서 실제 완료될 때 설정
    existingParticipant.completed_at = null;

    const savedParticipant = await this.participantRepository.save(existingParticipant);

    // 현재 참가자 수 확인
    const currentCount = await this.participantRepository.count({
      where: { challenge: { idx: challengeRoomIdx }, status: ChallengerStatus.PARTICIPATING },
    });

    // 최대 참가인원이 모두 찬 경우 도전 시작
    if (currentCount >= challengeRoom.max_participants && challengeRoom.status === ChallengeStatus.PENDING) {
      const now = new Date();
      challengeRoom.start_date = now;

      // 기간 단위에 따른 일수 계산
      const unitToDays = {
        [DurationUnit.DAY]: 1,
        [DurationUnit.WEEK]: 7,
        [DurationUnit.MONTH]: 30,
      };

      const durationDays = challengeRoom.duration_value * unitToDays[challengeRoom.duration_unit];
      const endDate = new Date(now);
      endDate.setDate(now.getDate() + durationDays);

      challengeRoom.end_date = endDate;
      challengeRoom.status = ChallengeStatus.ONGOING;
      await this.challengeRoomRepository.save(challengeRoom);
    }

    await queryRunner.commitTransaction();
    return savedParticipant;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`)
      throw new InternalServerErrorException(`도전 방 입장 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // 3. 도전 참가 취소
  async cancelParticipation(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
    const challengeRoom = await this.challengeRoomRepository.findOne({ where: { idx: challengeRoomIdx } });
    if (!challengeRoom || !challengeRoom.is_public) {
      throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
    }

    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const existingParticipant = await this.participantRepository.findOne({
      where: { user: { idx: userIdx }, challenge: { idx: challengeRoomIdx } },
    });

    if (!existingParticipant) {
      throw new NotFoundException('도전방에 입장하지 않았습니다.');
    }

    if (existingParticipant.status !== ChallengerStatus.PARTICIPATING) {
      throw new ConflictException('취소할 수 있는 상태가 아닙니다.');
    }

    existingParticipant.status = ChallengerStatus.PENDING;
    existingParticipant.completed_at = null;

    await queryRunner.commitTransaction();
    return await this.participantRepository.save(existingParticipant);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`error: ${error}`)
      throw new InternalServerErrorException(`도전 방 입장 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
