import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, DataSource } from 'typeorm';
  import { Follow } from 'src/common/entities/follow.entity';
  import { User } from 'src/common/entities/user.entity';
  import { FollowResDto, FollowListResDto, UserFollowInfoDto } from './dto/res.dto';

  @Injectable()
  export class FollowService {
    constructor(
      @InjectRepository(Follow)
      private readonly followRepository: Repository<Follow>,
      @InjectRepository(User)
      private readonly userRepository: Repository<User>,
      private readonly dataSource: DataSource,
    ) {}
  
    // 1. 팔로우하기
    async followUser(
      follower_idx: string,
      following_idx: string,
    ): Promise<FollowResDto> {
      if (follower_idx === following_idx) {
        throw new BadRequestException('자기 자신을 팔로우할 수 없습니다.');
      }
  
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
  
      try {
        // 팔로우할 유저 존재 확인
        const followingUser = await this.userRepository.findOne({
          where: { idx: following_idx },
        });
        if (!followingUser) {
          throw new NotFoundException('팔로우할 유저를 찾을 수 없습니다.');
        }
  
        // 이미 팔로우 중인지 확인
        const existingFollow = await this.followRepository.findOne({
          where: {
            follower: { idx: follower_idx },
            following: { idx: following_idx },
          },
        });
        if (existingFollow) {
          throw new ConflictException('이미 팔로우 중인 유저입니다.');
        }
  
        // 팔로우 관계 생성
        const follow = this.followRepository.create({
          follower: { idx: follower_idx },
          following: { idx: following_idx },
        });
        await this.followRepository.save(follow);
  
        // 카운트 업데이트
        await this.userRepository.increment(
          { idx: follower_idx },
          'following_count',
          1,
        );
        await this.userRepository.increment(
          { idx: following_idx },
          'follower_count',
          1,
        );
  
        await queryRunner.commitTransaction();
        return { message: '팔로우했습니다.' };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  
    // 2. 언팔로우하기
    async unfollowUser(
      follower_idx: string,
      following_idx: string,
    ): Promise<FollowResDto> {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
  
      try {
        // 팔로우 관계 찾기
        const follow = await this.followRepository.findOne({
          where: {
            follower: { idx: follower_idx },
            following: { idx: following_idx },
          },
        });
        if (!follow) {
          throw new NotFoundException('팔로우 관계를 찾을 수 없습니다.');
        }
  
        // 팔로우 관계 삭제
        await this.followRepository.remove(follow);
  
        // 카운트 감소
        await this.userRepository.decrement(
          { idx: follower_idx },
          'following_count',
          1,
        );
        await this.userRepository.decrement(
          { idx: following_idx },
          'follower_count',
          1,
        );
  
        await queryRunner.commitTransaction();
        return { message: '언팔로우했습니다.' };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }
  
    // 3. (특정유저, 나) 팔로잉 목록 조회
    async getFollowingList(
      user_idx: string,
      current_user_idx?: string,
    ): Promise<FollowListResDto> {
      const queryBuilder = this.followRepository
        .createQueryBuilder('follow')
        .leftJoinAndSelect('follow.following', 'following')
        .leftJoinAndSelect('following.profile', 'profile')
        .where('follow.follower = :user_idx', { user_idx })
        .orderBy('follow.created_at', 'DESC');
  
      const [follows, total] = await queryBuilder.getManyAndCount();
  
      // 현재 로그인한 유저가 각 유저를 팔로우하는지 확인
      const users: UserFollowInfoDto[] = await Promise.all(
        follows.map(async (follow) => {
          let is_following = false;
          if (current_user_idx && current_user_idx !== follow.following.idx) {
            const followCheck = await this.followRepository.findOne({
              where: {
                follower: { idx: current_user_idx },
                following: { idx: follow.following.idx },
              },
            });
            is_following = !!followCheck;
          }
  
          return {
            idx: follow.following.idx,
            nickname: follow.following.nickname,
            name: follow.following.name,
            profile_image_url: follow.following.profile?.profile_image_url,
            is_following,
          };
        }),
      );
  
      return { users, total };
    }
  
    // 4. (특정유저, 나) 팔로워 목록 조회
    async getFollowerList(
      user_idx: string,
      current_user_idx?: string,
    ): Promise<FollowListResDto> {
      const queryBuilder = this.followRepository
        .createQueryBuilder('follow')
        .leftJoinAndSelect('follow.follower', 'follower')
        .leftJoinAndSelect('follower.profile', 'profile')
        .where('follow.following = :user_idx', { user_idx })
        .orderBy('follow.created_at', 'DESC');
  
      const [follows, total] = await queryBuilder.getManyAndCount();
  
      // 현재 로그인한 유저가 각 유저를 팔로우하는지 확인
      const users: UserFollowInfoDto[] = await Promise.all(
        follows.map(async (follow) => {
          let is_following = false;
          if (current_user_idx && current_user_idx !== follow.follower.idx) {
            const followCheck = await this.followRepository.findOne({
              where: {
                follower: { idx: current_user_idx },
                following: { idx: follow.follower.idx },
              },
            });
            is_following = !!followCheck;
          }
  
          return {
            idx: follow.follower.idx,
            nickname: follow.follower.nickname,
            name: follow.follower.name,
            profile_image_url: follow.follower.profile?.profile_image_url,
            is_following,
          };
        }),
      );
  
      return { users, total };
    }
  
    // 팔로우 여부 확인
    async checkFollowStatus(
      follower_idx: string,
      following_idx: string,
    ): Promise<boolean> {
      const follow = await this.followRepository.findOne({
        where: {
          follower: { idx: follower_idx },
          following: { idx: following_idx },
        },
      });
      return !!follow;
    }
  }