import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChallengeRoom } from 'src/common/entities/challenge_room.entity';
import { ChallengerStatus, ChallengeStatus, DurationUnit } from 'src/common/enum/enum';
import { ChallengeParticipant } from 'src/common/entities/challenge_participant.entity';
import { Ranking } from 'src/common/entities/ranking.entity';

@Injectable()
export class ChallengeScheduler {
  constructor(
    @InjectRepository(ChallengeRoom)
    private readonly challengeRoomRepository: Repository<ChallengeRoom>,
    @InjectRepository(ChallengeParticipant)
    private readonly participantRepository: Repository<ChallengeParticipant>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Seoul' })
  async updateChallengeRoomStatus() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const now = new Date();
    try {
      // 1. PENDING -> ONGOING 상태 변경
      const pendingRooms = await this.challengeRoomRepository.find({
        where: { status: ChallengeStatus.PENDING },
      });

      for (const room of pendingRooms) {
        if (room.start_date && new Date(room.start_date) <= now) {
          room.status = ChallengeStatus.ONGOING;
          await queryRunner.manager.save(room);
          
          // 해당 도전방의 모든 참가자 상태를 ONGOING으로 변경
          await queryRunner.manager.update(
            ChallengeParticipant,
            {
              challenge: { idx: room.idx },
              status: ChallengerStatus.PENDING,
            },
            {
              status: ChallengerStatus.ONGOING,
            },
          );
        }
      }

      // 2. ONGOING -> COMPLETED 상태 변경 (도전방 + 참가자 모두) + 포인트 지급
      const ongoingRooms = await this.challengeRoomRepository.find({
        where: { status: ChallengeStatus.ONGOING },
        relations: ['challenge_participants', 'challenge_participants.user'],
      });

      for (const room of ongoingRooms) {
        if (room.end_date && new Date(room.end_date) < now) {
          // 도전방 상태 변경
          room.status = ChallengeStatus.COMPLETED;
          await queryRunner.manager.save(room);

          // 도전 기간 계산 (일 단위로 변환)
          const challengeDays = this.calculateChallengeDays(room.duration_unit, room.duration_value);
          
          // 포인트 계산: 기본 100점 + (도전일 수 - 1) × 10점
          const completionPoints = 100 + (challengeDays - 1) * 10;

          console.log(`도전방 완료: ${room.title}, 기간: ${challengeDays}일, 지급포인트: ${completionPoints}점`);

          // 해당 도전방의 진행 중인 참가자들을 COMPLETED로 변경하고 포인트 지급
          const ongoingParticipants = await queryRunner.manager.find(ChallengeParticipant, {
            where: {
              challenge: { idx: room.idx },
              status: ChallengerStatus.ONGOING,
            },
            relations: ['user'],
          });

          for (const participant of ongoingParticipants) {
            // 참가자 상태 업데이트
            await queryRunner.manager.update(
              ChallengeParticipant,
              { idx: participant.idx },
              {
                status: ChallengerStatus.COMPLETED,
                completed_at: new Date(),
              },
            );

            // 사용자에게 포인트 추가
            if (participant.user) {
              await this.updateUserPoints(queryRunner, participant.user.idx, completionPoints);
              console.log(`사용자 ${participant.user.nickname}에게 ${completionPoints}점 지급 완료`);
            }
          }
        }
      }
      
      await queryRunner.commitTransaction();
      console.log('도전방 상태 업데이트 및 포인트 지급 완료');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`도전방 상태 업데이트 실패: ${error.message}`);
      throw new InternalServerErrorException(`도전방 상태 업데이트 실패: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 도전 기간을 일(day) 단위로 변환하는 헬퍼 메서드
   * @param unit 기간 단위 (일/주/개월)
   * @param value 기간 값
   * @returns 일 단위로 변환된 기간
   */
  private calculateChallengeDays(unit: DurationUnit, value: number): number {
    switch (unit) {
      case DurationUnit.DAY:
        return value; // 1일 = 1일
      case DurationUnit.WEEK:
        return value * 7; // 1주 = 7일
      case DurationUnit.MONTH:
        return value * 30; // 1개월 = 30일
      default:
        return value; // 기본값은 일로 처리
    }
  }

  // 헬퍼 메서드: 사용자 포인트 업데이트 또는 생성
  private async updateUserPoints(queryRunner: any, userIdx: string, pointChange: number): Promise<void> {
    // 기존 랭킹 레코드 조회
    let ranking = await queryRunner.manager.findOne(Ranking, {
      where: { user_idx: userIdx }
    });

    if (ranking) {
      // 기존 레코드가 있으면 포인트 업데이트
      const newPoints = Math.max(0, ranking.points + pointChange); // 0점 미만으로 내려가지 않도록
      await queryRunner.manager.update(Ranking, 
        { user_idx: userIdx }, 
        { points: newPoints }
      );
    } else {
      // 기존 레코드가 없으면 새로 생성 (양수일 때만)
      if (pointChange > 0) {
        const newRanking = queryRunner.manager.create(Ranking, {
          user_idx: userIdx,
          points: pointChange,
          ranks: 0,
        });
        await queryRunner.manager.save(newRanking);
      }
    }
  }
}