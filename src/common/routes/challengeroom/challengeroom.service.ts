import { Cron, CronExpression } from '@nestjs/schedule';
import { ChallengeStatus, DurationUnit } from 'src/common/enum/enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { User } from 'src/common/entities/user.entity';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateChallengeRoomReqDto, JoinChallengeRoomReqDto, KickParticipantReqDto } from './dto/req.dto';
import { GetChallengeRoomsResDto } from './dto/res.dto';

@Injectable()
export class ChallengeroomService {
  constructor(
    @InjectRepository(ChallengeRoom)
    private challengeRepository: Repository<ChallengeRoom>,
    @InjectRepository(ChallengeParticipant)
    private participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 1. 도전 방 생성
  async createChallengeRoom(
    user_idx: string,
    createChallengeRoomDto: CreateChallengeRoomReqDto,
  ): Promise<ChallengeRoom> {
    const user = await this.userRepository.findOne({ where: { idx: user_idx } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const challengeRoom = this.challengeRepository.create({
      ...createChallengeRoomDto,
      start_date: null,
      end_date: null,
      status: ChallengeStatus.PENDING,
      user,
    });

    return await this.challengeRepository.save(challengeRoom);
  }

  // 2. 도전 방 목록조회
  async getChallengeRooms(): Promise<GetChallengeRoomsResDto> {
    const challengeRooms = await this.challengeRepository.find({ where: { is_public: true } });
    return { challengeRooms };
  }

  // 3. 도전 방 상세조회
  async getChallengeRoomDetail(idx: string): Promise<ChallengeRoom> {
    const challengeRoom = await this.challengeRepository.findOne({ where: { idx }, relations: ['user', 'challenge_participants'] });
    if (!challengeRoom) {
      throw new NotFoundException('도전방을 찾을 수 없습니다.');
    }
    return challengeRoom;
  }
}
