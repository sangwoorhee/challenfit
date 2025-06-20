import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SubscriptionPaymentStatus } from '../enum/enum';
import { User } from './user.entity';
import { Subscription } from './subscription.entity';

@Entity({ name: 'subscription_payment' })
export class SubscriptionPayment {
  @PrimaryGeneratedColumn({ type: 'int' })
  @ApiProperty({ description: 'PK' })
  idx: number;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '결제 일시' })
  payment_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: '결제 금액' })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  @ApiProperty({ description: '결제 수단 (ex: card, kakao, toss)' })
  method: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPaymentStatus,
    default: SubscriptionPaymentStatus.PENDING,
  })
  @ApiProperty({
    description: '결제 상태',
    enum: SubscriptionPaymentStatus,
    default: SubscriptionPaymentStatus.PENDING,
  })
  status: SubscriptionPaymentStatus;

  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({ description: 'PG사 트랜잭션 ID' })
  transaction_id: string;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.subscription_payments, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  @ManyToOne(() => Subscription, (subscription) => subscription.payments, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (구독 idx)' })
  @JoinColumn({ name: 'subscription_idx' })
  subscription: Subscription;
}
