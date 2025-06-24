import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationType } from '../enum/enum';
import { User } from './user.entity';

// 알림 엔티티
@Entity({ name: 'notification' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  @ApiProperty({
    description: '알림 종류',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({ description: '알림 제목' })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  @ApiProperty({ description: '알림 본문 내용' })
  content: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '읽음 여부', default: false })
  is_read: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '알림 생성일시' })
  created_at: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_idx' })
  @ApiProperty({ description: '유저 정보 (FK)' })
  user: User;
}
