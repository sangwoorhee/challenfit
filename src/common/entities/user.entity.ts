import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserProvider, UserStatus } from '../enum/enum';
import { AuthLog } from './auth-log.entity';
import { CertPhoto } from './cert_photo.entity';
import { ChallengeParticipant } from './challenge_participant.entity';
import { Subscription } from './subscription.entity';
import { SubscriptionPayment } from './subscription_payment.entity';
import { WorkoutLog } from './workout-log.entity';
import { Ranking } from './ranking.entity';
import { ChallengeRoom } from './challenge_room.entity';
import { Notification } from './notification.entity';
import { UserProfile } from './user_profile.entity';
import { UserSetting } from './user_setting.entity';
import { RefreshToken } from './refresh_token.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';

// User 엔티티
@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({ description: '이메일' })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({ description: '비밀번호' })
  password: string;

  @Column({ type: 'varchar', length: 20 })
  @ApiProperty({ description: '휴대폰 번호' })
  phone: string;

  @Column({ type: 'varchar', length: 50 })
  @ApiProperty({ description: '이름' })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  @ApiProperty({ description: '닉네임' })
  nickname: string;

  @Column({ type: 'enum', enum: UserProvider, default: UserProvider.LOCAL })
  @ApiProperty({ description: '가입 경로', enum: UserProvider })
  provider: UserProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiProperty({ description: '소셜 UID', required: false })
  provider_uid?: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  @ApiProperty({ description: '상태', enum: UserStatus })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '챌린지 모드 여부', default: false })
  challenge_mode: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '계정 생성일' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '계정 수정일' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '마지막 로그인 시각', required: false })
  last_login?: Date;

  // 관계 설정
  @OneToMany(() => AuthLog, (authLog) => authLog.user)
  @ApiProperty({ type: () => [AuthLog], description: '인증 로그 목록' })
  auth_logs: AuthLog[];

  @OneToMany(() => CertPhoto, (certPhoto) => certPhoto.user)
  @ApiProperty({ type: () => [CertPhoto], description: '운동 사진 목록' })
  cert_photos: CertPhoto[];

  @OneToMany(() => ChallengeParticipant, (participant) => participant.user)
  @ApiProperty({ type: () => [ChallengeParticipant], description: '참가자 목록' })
  challenge_participants: ChallengeParticipant[];

  @OneToMany(() => Notification, (notification) => notification.user)
  @ApiProperty({ type: () => [Notification], description: '알림 내역 목록' })
  notifications: Notification[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  @ApiProperty({ type: () => [Subscription], description: '구독 목록' })
  subscriptions: Subscription[];

  @OneToMany(() => SubscriptionPayment, (payment) => payment.user)
  @ApiProperty({ type: () => [SubscriptionPayment], description: '구독 결제기록 목록' })
  subscription_payments: SubscriptionPayment[];

  @OneToMany(() => WorkoutLog, (log) => log.user)
  @ApiProperty({ type: () => [WorkoutLog], description: '운동일지 목록' })
  workout_logs: WorkoutLog[];

  @OneToOne(() => Ranking, (ranking) => ranking.user)
  @ApiProperty({ type: () => [Ranking], description: '랭킹 목록' })
  ranking: Ranking;

  @OneToMany(() => ChallengeRoom, (challenge) => challenge.user)
  @ApiProperty({ type: () => [ChallengeRoom], description: '챌린지 목록' })
  challenges: ChallengeRoom[];

  @OneToMany(() => Comment, (comment) => comment.user)
  @ApiProperty({ type: () => [Comment], description: '댓글 목록' })
  comments: Comment[];

  @OneToMany(() => Like, (like) => like.user)
  @ApiProperty({ type: () => [Like], description: '좋아요 목록' })
  likes: Like[];

  @OneToOne(() => UserSetting, (setting) => setting.user, { cascade: true })
  @ApiProperty({ type: () => [UserSetting], description: '유저 셋팅' })
  setting: UserSetting;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  @ApiProperty({ type: () => [UserProfile], description: '유저 프로필' })
  profile: UserProfile;

  @OneToOne(() => RefreshToken, (refreshToken) => refreshToken.user)
  @ApiProperty({ type: () => RefreshToken, description: '리프레시 토큰' })
  refreshToken: RefreshToken;
}