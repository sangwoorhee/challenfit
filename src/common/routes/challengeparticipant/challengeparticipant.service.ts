import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengeStatus, DurationUnit } from 'src/common/enum/enum';
import { Repository } from 'typeorm';

@Injectable()
export class ChallengeparticipantService {
  constructor(
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(ChallengeRoom)
    private readonly challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

   // 1. 도전방 입장
  async enterChallengeRoom(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
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
      status: 'pending', // 입장만 한 상태
      joined_at: new Date(),
      completed_at: null,
    });

    return await this.participantRepository.save(participant);
  }

  // 2. 도전 참가
  async participateChallengeRoom(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
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

    if (existingParticipant.status === 'active') {
      throw new ConflictException('이미 도전에 참가했습니다.');
    }

    existingParticipant.status = 'active';
    existingParticipant.completed_at = challengeRoom.end_date;

    const savedParticipant = await this.participantRepository.save(existingParticipant);

    const currentCount = await this.participantRepository.count({
      where: { challenge: { idx: challengeRoomIdx }, status: 'active' },
    });

    if (currentCount >= challengeRoom.max_participants && challengeRoom.status === ChallengeStatus.PENDING) {
      const now = new Date();
      challengeRoom.start_date = now;

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

    return savedParticipant;
  }
}
