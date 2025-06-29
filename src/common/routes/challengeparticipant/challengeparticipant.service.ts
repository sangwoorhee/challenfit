import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
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
        const challengeRoom = await this.challengeRoomRepository.findOne({ where: { idx: challengeRoomIdx } });
        if (!challengeRoom || !challengeRoom.is_public) {
          throw new NotFoundException('도전방을 찾을 수 없거나 비공개 방입니다.');
        }
    
        const user = await this.userRepository.findOne({ where: { idx: userIdx } });
        if (!user) {
          throw new NotFoundException('사용자를 찾을 수 없습니다.');
        }
    
        const participant = this.participantRepository.create({
          user,
          challenge: challengeRoom,
          status: 'active',
          joined_at: new Date(),
          completed_at: challengeRoom.end_date,
        });
    
        return await this.participantRepository.save(participant);
      }   
}
