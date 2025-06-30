import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { User } from 'src/common/entities/user.entity';
import { WorkoutCert } from 'src/common/entities/workout-cert.entity';
import { Repository } from 'typeorm';

@Injectable()
export class WorkoutcertService {
    constructor(
  @InjectRepository(WorkoutCert)
  private workoutCertRepository: Repository<WorkoutCert>,
  @InjectRepository(User)
  private userRepository: Repository<User>,
) {}

    // 1. 내가 참가한 모든 도전방에서의 인증글(workout-cert)을 최신순으로 조회
    async getWorkoutCertsByUser(userIdx: string): Promise<WorkoutCert[]> {
    const user = await this.userRepository.findOne({ where: { idx: userIdx } });
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다.');

    const certs = await this.workoutCertRepository.find({
        where: { user: { idx: userIdx } },
        order: { is_completed: 'DESC' },
        relations: ['challenge_participant', 'challenge_participant.challenge'],
    });

    return certs;
    }
}
