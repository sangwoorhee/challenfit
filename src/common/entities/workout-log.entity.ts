import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

// 운동 일지 엔티티
@Entity({ name: 'workout_log' })
export class WorkoutLog {
  @PrimaryGeneratedColumn({ type: 'int' })
  @ApiProperty({ description: 'PK' })
  idx: number;

  @Column({ type: 'date' })
  @ApiProperty({ description: '운동 일지 작성 날짜' })
  log_date: string;

  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({ description: '제목' })
  title: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: '내용', required: false })
  content?: string;

  @Column({ type: 'json' })
  @ApiProperty({ description: '운동 세부 데이터 (JSON)' })
  exercises_data: any;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '작성일시' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '수정일시' })
  updated_at: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;
}
