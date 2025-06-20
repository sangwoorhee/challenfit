import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'ranking' })
export class Ranking {
  @PrimaryColumn({ type: 'int' })
  user_idx: number;

  @Column({ type: 'int', default: 0 })
  @ApiProperty({ description: '누적 점수', default: 0 })
  points: number;

  @Column({ type: 'int', default: 0 })
  @ApiProperty({ description: '현재 등수', default: 0 })
  ranks: number;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성일시' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '수정일시' })
  updated_at: Date;

  // 관계 설정
  @OneToOne(() => User, (user) => user.ranking, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'PK (유저 idx, 일대일관계)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;
}
