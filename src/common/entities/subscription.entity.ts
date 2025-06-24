import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { SubscriptionPlanType, SubscriptionStatus } from '../enum/enum';
import { User } from './user.entity';
import { SubscriptionPayment } from './subscription_payment.entity';

// 구독 엔티티
@Entity({ name: 'subscription' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlanType,
    default: SubscriptionPlanType.BASIC,
  })
  @ApiProperty({
    description: '구독 플랜 종류',
    enum: SubscriptionPlanType,
  })
  plan_type: SubscriptionPlanType;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  @ApiProperty({
    description: '구독 상태',
    enum: SubscriptionStatus,
  })
  status: SubscriptionStatus;

  @Column({ type: 'date' })
  @ApiProperty({ description: '구독 시작일' })
  start_date: string;

  @Column({ type: 'date' })
  @ApiProperty({ description: '구독 종료일' })
  end_date: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '자동 갱신 여부', default: false })
  auto_renew: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성일시' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '구독 취소일시', required: false })
  canceled_at?: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  @OneToMany(() => SubscriptionPayment, (payment) => payment.subscription)
  @ApiProperty({ type: () => [SubscriptionPayment], description: '결제 내역 목록' })
  payments: SubscriptionPayment[];
}
