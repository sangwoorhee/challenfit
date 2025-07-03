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
import { ChallengeParticipant } from './challenge_participant.entity';

// 운동 인증 엔티티
@Entity({ name: 'workout_cert' })
export class WorkoutCert {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'varchar' })
  @ApiProperty({ description: '이미지 URL' })
  image_url: string;

  @Column({ type: 'text' })
  @ApiProperty({ description: '캡션' })
  caption: string;

  @Column({ type: 'boolean' })
  @ApiProperty({ description: '쉬는날인지 여부', required: false })
  is_rest: boolean;

  @Column({ type: 'int' })
  @ApiProperty({ description: '목표 승인 수' })
  target_approval_count: number;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '인증 완료 여부' })
  is_completed: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성 시간' })
  created_at: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  @ManyToOne(() => ChallengeParticipant, (challenge_participant) => challenge_participant.workout_cert, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (도전자 idx)' })
  @JoinColumn({ name: 'challenge_participant_idx' })
  challenge_participant: ChallengeParticipant;
}
