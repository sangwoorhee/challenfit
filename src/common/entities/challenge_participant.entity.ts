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
import { ChallengeRoom } from './challenge_room.entity';

// 도전자 엔티티
@Entity({ name: 'challenge_participant' })
export class ChallengeParticipant {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @CreateDateColumn({
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({ description: '참가 신청일시' })
  joined_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: false })
  @ApiProperty({ description: '참여 상태' })
  status: string;

  @Column({
    type: 'timestamp',
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

  @ManyToOne(() => ChallengeRoom, (challenge) => challenge.challenge_participants, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (챌린지 idx)' })
  @JoinColumn({ name: 'challenge_room_idx' })
  challenge: ChallengeRoom;
}
