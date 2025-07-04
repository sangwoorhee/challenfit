import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { ChallengeRoom } from './challenge_room.entity';
import { WorkoutCert } from './workout-cert.entity';
import { ChallengerStatus } from '../enum/enum';

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

    @Column({
    type: 'enum',
    enum: ChallengerStatus,
    default: ChallengerStatus.PENDING,
    nullable: false,
  })
  @ApiProperty({ description: '참여 상태', enum: ChallengerStatus, default: ChallengerStatus.PENDING })
  status: ChallengerStatus;

  @Column({
    type: 'timestamp',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({ description: '챌린지 완료 일시' })
  completed_at: Date | null;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.challenge_participants, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  @ManyToOne(() => ChallengeRoom, (challenge) => challenge.challenge_participants, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (챌린지 idx)' })
  @JoinColumn({ name: 'challenge_room_idx' })
  challenge: ChallengeRoom;

  @OneToMany(() => WorkoutCert, (workout_cert) => workout_cert.challenge_participant, { cascade: true })
  @ApiProperty({ type: () => [WorkoutCert], description: '운동 인증' })
  workout_cert: WorkoutCert[];
}
