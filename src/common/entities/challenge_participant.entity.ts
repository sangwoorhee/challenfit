import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Challenge } from './challenge.entity';

// 도전자 엔티티
@Entity({ name: 'challenge_participant' })
export class ChallengeParticipant {
  @PrimaryGeneratedColumn({ type: 'int' })
  @ApiProperty({ description: 'PK' })
  idx: number;

  @CreateDateColumn({
    type: 'datetime',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({ description: '참가 신청일시' })
  joined_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '참여 상태' })
  status: string;

  @Column({
    type: 'datetime',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({ description: '챌린지 완료 일시' })
  completed_at: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.challenge_participants, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  @ManyToOne(() => Challenge, (challenge) => challenge.challenge_participants, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (챌린지 idx)' })
  @JoinColumn({ name: 'challenge_idx' })
  challenge: Challenge;
}
