import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Inject,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository, DataSource } from 'typeorm';
  import { Follow } from 'src/common/entities/follow.entity';
  import { User } from 'src/common/entities/user.entity';
  import { FollowResDto, FollowListResDto, UserFollowInfoDto } from './dto/res.dto';
  import { CACHE_MANAGER } from '@nestjs/cache-manager';
  import { Cache } from 'cache-manager';
  import { UserProfile } from 'src/common/entities/user_profile.entity';
  import { FollowRequest } from 'src/common/entities/follow_request.entity';
  import { FollowRequestStatus } from 'src/common/enum/enum';
  import { Ranking } from 'src/common/entities/ranking.entity';

  interface FollowNotification {
    type: 'follow' | 'follow_request' | 'follow_accept' | 'follow_reject';
    follower_idx?: string;
    requester_idx?: string;
    requested_idx?: string;
    message: string;
    created_at: Date;
  }

  @Injectable()
  export class FollowService {
    constructor(
      @InjectRepository(Follow)
      private readonly followRepository: Repository<Follow>,
      @InjectRepository(User)
      private readonly userRepository: Repository<User>,
      @InjectRepository(UserProfile)
      private readonly userProfileRepository: Repository<UserProfile>,
      @InjectRepository(FollowRequest)
      private readonly followRequestRepository: Repository<FollowRequest>,
      @InjectRepository(Ranking)
      private readonly rankingRepository: Repository<Ranking>,
      private readonly dataSource: DataSource,
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}
  
    // 1. 팔로우하기 (공개/비공개 구분)
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
        // 팔로우할 유저와 프로필 정보 가져오기
        const followingUser = await this.userRepository.findOne({
          where: { idx: following_idx },
          relations: ['profile'],
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
    
        // 기존 팔로우 요청 확인 (모든 상태)
        const existingRequest = await this.followRequestRepository.findOne({
          where: {
            requester: { idx: follower_idx },
            requested: { idx: following_idx },
          },
        });
    
        // 이미 대기 중인 요청이 있는 경우
        if (existingRequest && existingRequest.status === FollowRequestStatus.PENDING) {
          throw new ConflictException('이미 팔로우 요청을 보낸 상태입니다.');
        }
    
        // 취소, 거절, 수락된 요청이 있는 경우 모두 삭제
        if (existingRequest && 
            (existingRequest.status === FollowRequestStatus.CANCELLED || 
             existingRequest.status === FollowRequestStatus.REJECTED ||
             existingRequest.status === FollowRequestStatus.ACCEPTED)) {
          await queryRunner.manager.remove(existingRequest);
        }
    
        let message: string;
    
        // 공개 계정인 경우 - 바로 팔로우
        if (followingUser.profile?.is_public === true) {
          const follow = this.followRepository.create({
            follower: { idx: follower_idx },
            following: { idx: following_idx },
          });
          await queryRunner.manager.save(follow);
    
          // 카운트 업데이트
          await queryRunner.manager.increment(
            User,
            { idx: follower_idx },
            'following_count',
            1,
          );
          await queryRunner.manager.increment(
            User,
            { idx: following_idx },
            'follower_count',
            1,
          );

          // 팔로우 받은 유저의 포인트 15점 추가
          await this.updateUserPoints(queryRunner, following_idx, 15);
    
          message = '팔로우했습니다.';
    
          // 캐시에 팔로우 알림 메시지 저장
          await (this.cacheManager as any).set(
            `follow_notification:${following_idx}`,
            {
              type: 'follow',
              follower_idx,
              message: `${follower_idx}님이 회원님을 팔로우하기 시작했습니다.`,
              created_at: new Date(),
            },
            {ttl : 3600}, // 1시간 TTL
          );
        } 
        // 비공개 계정인 경우 - 팔로우 신청
        else {
          const followRequest = this.followRequestRepository.create({
            requester: { idx: follower_idx },
            requested: { idx: following_idx },
            status: FollowRequestStatus.PENDING,
          });
          await queryRunner.manager.save(followRequest);
    
          message = '팔로우 요청을 보냈습니다.';
    
          // 캐시에 팔로우 요청 알림 메시지 저장
          await (this.cacheManager as any).set(
            `follow_request_notification:${following_idx}`,
            {
              type: 'follow_request',
              requester_idx: follower_idx,
              message: `${follower_idx}님이 팔로우를 요청했습니다.`,
              created_at: new Date(),
            },
            {ttl : 3600}, // 1시간 TTL
          );
        }
    
        await queryRunner.commitTransaction();
        return { result: 'ok', message };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // 2. 팔로우 관련 알림 삭제
      async clearFollowNotifications(user_idx: string): Promise<void> {
        await this.cacheManager.del(`follow_notification:${user_idx}`);
        await this.cacheManager.del(`follow_request_notification:${user_idx}`);
        await this.cacheManager.del(`follow_accept_notification:${user_idx}`);
        await this.cacheManager.del(`follow_reject_notification:${user_idx}`);
      }
  
    // 3. 언팔로우하기
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
          relations: ['following']
        });
        if (!follow) {
          throw new NotFoundException('팔로우 관계를 찾을 수 없습니다.');
        }
    
        // 팔로우 관계 삭제
        await queryRunner.manager.remove(follow);
    
        // 관련된 팔로우 요청도 삭제 (ACCEPTED 상태의 요청)
        const followRequest = await this.followRequestRepository.findOne({
          where: {
            requester: { idx: follower_idx },
            requested: { idx: following_idx },
            status: FollowRequestStatus.ACCEPTED,
          },
        });
        
        if (followRequest) {
          await queryRunner.manager.remove(followRequest);
        }
    
        // 카운트 감소
        await queryRunner.manager.decrement(
          User,
          { idx: follower_idx },
          'following_count',
          1,
        );
        await queryRunner.manager.decrement(
          User,
          { idx: following_idx },
          'follower_count',
          1,
        );

        // 팔로우 받던 유저의 포인트 15점 차감
        await this.updateUserPoints(queryRunner, following_idx, -15);
    
        await queryRunner.commitTransaction();
        return { result: 'ok', message: '언팔로우했습니다.' };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // 4. 팔로우 요청 수락
    async acceptFollowRequest(
      requested_idx: string,
      requester_idx: string,
    ): Promise<FollowResDto> {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
    
      try {
        // 팔로우 요청 찾기
        const request = await this.followRequestRepository.findOne({
          where: {
            requester: { idx: requester_idx },
            requested: { idx: requested_idx },
            status: FollowRequestStatus.PENDING,
          },
        });
    
        if (!request) {
          throw new NotFoundException('팔로우 요청을 찾을 수 없습니다.');
        }
    
        // 팔로우 관계 생성
        const follow = this.followRepository.create({
          follower: { idx: requester_idx },
          following: { idx: requested_idx },
        });
        await queryRunner.manager.save(follow);
    
        // 요청 레코드 삭제
        await queryRunner.manager.remove(request);
    
        // 카운트 업데이트
        await queryRunner.manager.increment(
          User,
          { idx: requester_idx },
          'following_count',
          1,
        );
        await queryRunner.manager.increment(
          User,
          { idx: requested_idx },
          'follower_count',
          1,
        );

        // 팔로우 요청을 수락한 유저(비공개 유저)의 포인트 15점 추가
        await this.updateUserPoints(queryRunner, requested_idx, 15);
    
        // 캐시에 수락 알림 메시지 저장
        await (this.cacheManager as any).set(
          `follow_accept_notification:${requester_idx}`,
          {
            type: 'follow_accept',
            requested_idx,
            message: `${requested_idx}님이 팔로우 요청을 수락했습니다.`,
            created_at: new Date(),
          },
          {ttl : 3600}, // 1시간 TTL
        );
    
        await queryRunner.commitTransaction();
        return { result: 'ok', message: '팔로우 요청을 수락했습니다.' };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // 5. 팔로우 요청 거절
    async rejectFollowRequest(
      requested_idx: string,
      requester_idx: string,
    ): Promise<FollowResDto> {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
  
      try {
        // 팔로우 요청 찾기
        const request = await this.followRequestRepository.findOne({
          where: {
            requester: { idx: requester_idx },
            requested: { idx: requested_idx },
            status: FollowRequestStatus.PENDING,
          },
        });
  
        if (!request) {
          throw new NotFoundException('팔로우 요청을 찾을 수 없습니다.');
        }
  
        // 요청 상태를 거절로 변경
        request.status = FollowRequestStatus.REJECTED;
        await queryRunner.manager.save(request);
  
        // 캐시에 거절 알림 메시지 저장
        await (this.cacheManager as any).set(
          `follow_reject_notification:${requester_idx}`,
          {
            type: 'follow_reject',
            requested_idx,
            message: `${requested_idx}님이 팔로우 요청을 거절했습니다.`,
            created_at: new Date(),
          },
          {ttl : 3600}, // 1시간 TTL
        );
  
        await queryRunner.commitTransaction();
        return { result: 'ok', message: '팔로우 요청을 거절했습니다.' };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // 6. 팔로우 요청 취소
    async cancelFollowRequest(
      requester_idx: string,
      requested_idx: string,
    ): Promise<FollowResDto> {
      const request = await this.followRequestRepository.findOne({
        where: {
          requester: { idx: requester_idx },
          requested: { idx: requested_idx },
          status: FollowRequestStatus.PENDING,
        },
      });
    
      if (!request) {
        throw new NotFoundException('팔로우 요청을 찾을 수 없습니다.');
      }
    
      await this.followRequestRepository.remove(request);
    
      return { result: 'ok', message: '팔로우 요청을 취소했습니다.' };
    }

    // 7. 내가 보낸 팔로우 요청 목록 조회
    async getSentFollowRequests(user_idx: string): Promise<any> {
      const requests = await this.followRequestRepository.find({
        where: {
          requester: { idx: user_idx },
          status: FollowRequestStatus.PENDING,
        },
        relations: ['requested', 'requested.profile'],
        order: { created_at: 'DESC' },
      });
  
      return {
        result: 'ok',
        requests: requests.map(req => ({
          idx: req.idx,
          user: {
            idx: req.requested.idx,
            nickname: req.requested.nickname,
            name: req.requested.name,
            profile_image_url: req.requested.profile?.profile_image_url,
          },
          created_at: req.created_at,
        })),
        total: requests.length,
      };
    }

    // 8. 내가 받은 팔로우 요청 목록 조회
    async getReceivedFollowRequests(user_idx: string): Promise<any> {
      const requests = await this.followRequestRepository.find({
        where: {
          requested: { idx: user_idx },
          status: FollowRequestStatus.PENDING,
        },
        relations: ['requester', 'requester.profile'],
        order: { created_at: 'DESC' },
      });
  
      return {
        result: 'ok',
        requests: requests.map(req => ({
          idx: req.idx,
          user: {
            idx: req.requester.idx,
            nickname: req.requester.nickname,
            name: req.requester.name,
            profile_image_url: req.requester.profile?.profile_image_url,
          },
          created_at: req.created_at,
        })),
        total: requests.length,
      };
    }
  
    // 9, 11. (특정유저, 나) 팔로잉 목록 조회
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
  
      return { result: 'ok', users, total };
    }
  
    // 10, 12. (특정유저, 나) 팔로워 목록 조회
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
  
      return { result: 'ok', users, total };
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

    // 13. 팔로우 관련 알림 조회
    async getFollowNotifications(user_idx: string): Promise<FollowNotification[]> {
      const notifications: FollowNotification[] = [];
      
      // 팔로우 알림
      const followNotif = await this.cacheManager.get<FollowNotification>(`follow_notification:${user_idx}`);
      if (followNotif) {
        notifications.push(followNotif);
      }
      
      // 팔로우 요청 알림
      const requestNotif = await this.cacheManager.get<FollowNotification>(`follow_request_notification:${user_idx}`);
      if (requestNotif) {
        notifications.push(requestNotif);
      }
      
      // 팔로우 수락 알림
      const acceptNotif = await this.cacheManager.get<FollowNotification>(`follow_accept_notification:${user_idx}`);
      if (acceptNotif) {
        notifications.push(acceptNotif);
      }
      
      // 팔로우 거절 알림
      const rejectNotif = await this.cacheManager.get<FollowNotification>(`follow_reject_notification:${user_idx}`);
      if (rejectNotif) {
        notifications.push(rejectNotif);
      }
      
      // 시간순 정렬
      notifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return notifications;
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