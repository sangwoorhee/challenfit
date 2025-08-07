import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/common/entities/user.entity';
import { Ranking } from 'src/common/entities/ranking.entity';
import { GetRankingReqDto } from './dto/req.dto';
import { GetRankingResDto, UserRankingDto } from './dto/res.dto';

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ranking)
    private readonly rankingRepository: Repository<Ranking>,
  ) {}

  async getUserRankings(dto: GetRankingReqDto): Promise<GetRankingResDto> {
    const { page = 1, size = 20 } = dto;
    const skip = (page - 1) * size;

    // Ranking 엔티티를 기반으로 조회
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.ranking', 'ranking')
      .where('ranking.user_idx IS NOT NULL') // 랭킹 정보가 있는 사용자만
      .orderBy('ranking.points', 'DESC')
      .addOrderBy('user.created_at', 'ASC'); // 포인트가 같으면 가입일 순

    // 전체 개수 조회
    const totalCount = await queryBuilder.getCount();
    const totalPages = Math.ceil(totalCount / size);

    // 페이지네이션 적용하여 데이터 조회
    const users = await queryBuilder
      .skip(skip)
      .take(size)
      .getMany();

    // 랭킹 정보와 함께 DTO 변환
    const rankings: UserRankingDto[] = users.map((user, index) => {
      const rank = skip + index + 1; // 실제 랭킹 계산

      return {
        rank,
        user_idx: user.idx,
        email: user.email,
        phone: user.phone,
        name: user.name,
        nickname: user.nickname,
        provider: user.provider,
        provider_uid: user.provider_uid,
        status: user.status,
        challenge_mode: user.challenge_mode,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
        following_count: user.following_count,
        follower_count: user.follower_count,
        // Profile 정보
        profile_idx: user.profile?.idx,
        birth_date: user.profile?.birth_date,
        height: user.profile?.height,
        weight: user.profile?.weight,
        interest_exercises: user.profile?.interest_exercises,
        exercise_purpose: user.profile?.exercise_purpose,
        introduction: user.profile?.introduction,
        profile_image_url: user.profile?.profile_image_url,
        is_public: user.profile?.is_public ?? true,
        points: user.ranking?.points ?? 0, // ranking 엔티티에서 포인트 가져오기
      };
    });

    return {
      result: 'ok',
      page,
      size,
      totalCount,
      totalPages,
      rankings,
    };
  }

  // 특정 사용자의 랭킹 조회
  async getUserRank(userIdx: string): Promise<{ rank: number; points: number } | null> {
    const user = await this.userRepository.findOne({
      where: { idx: userIdx },
      relations: ['ranking'],
    });

    if (!user || !user.ranking) {
      return null;
    }

    // 해당 사용자보다 높은 포인트를 가진 사용자 수 + 1
    const higherRankCount = await this.rankingRepository
      .createQueryBuilder('ranking')
      .where('ranking.points > :userPoints', { userPoints: user.ranking.points })
      .getCount();

    return {
      rank: higherRankCount + 1,
      points: user.ranking.points,
    };
  }
}
