import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { ChallengeStatus } from 'src/common/enum/enum';
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

    // 1. 도전방 참가
    async joinChallengeRoom(challengeRoomIdx: string, userIdx: string): Promise<ChallengeParticipant> {
    // 도전방 조회 및 공개 여부 확인
    const challengeRoom = await this.challengeRoomRepository.findOne({
      where: { idx: challengeRoomIdx },
      relations: ['challenge_participants'],
    });

    if (!challengeRoom || !challengeRoom.is_public) {
      throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
    }

    // 유저 조회
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 이미 참가한 경우 중복 방지 (선택 사항)
    const existingParticipant = await this.participantRepository.findOne({
      where: { user: { idx: userIdx }, challenge: { idx: challengeRoomIdx } },
    });

    if (existingParticipant) {
      throw new ConflictException('이미 참가한 도전방입니다.');
    }

    // 도전자 엔티티 생성
    const participant = this.participantRepository.create({
      user,
      challenge: challengeRoom,
      status: 'active',
      joined_at: new Date(),
      completed_at: challengeRoom.end_date,
    });

    // 저장
    const savedParticipant = await this.participantRepository.save(participant);

    // 현재 참가자 수 확인
    const currentCount = await this.participantRepository.count({
      where: { challenge: { idx: challengeRoomIdx } },
    });

    // 참가자 수가 정원에 도달하면 도전방 상태를 자동으로 '진행중'으로 변경
    if (currentCount >= challengeRoom.max_participants) {
      challengeRoom.status = ChallengeStatus.ONGOING;
      await this.challengeRoomRepository.save(challengeRoom);
    }

    return savedParticipant;
  }
}
