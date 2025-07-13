import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';
import { ChallengeRoom } from './challenge_room.entity';
import { WorkoutCert } from './workout_cert.entity';
import { CertApproval } from './cert_approval.entity';
import { ChallengerStatus } from '../enum/enum';

// 참가 엔티티
@Entity({ name: 'challenge_participant' })
export class ChallengeParticipant {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '참가 신청일시' })
  joined_at: Date;

  @Column({
    type: 'enum',
    enum: ChallengerStatus,
    default: ChallengerStatus.PENDING,
  })
  @ApiProperty({ description: '참여 상태', enum: ChallengerStatus })
  status: ChallengerStatus;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '챌린지 완료 일시' })
  completed_at: Date | null;

  @ManyToOne(() => User, (user) => user.challenge_participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  @ManyToOne(() => ChallengeRoom, (room) => room.challenge_participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'challenge_room_idx' })
  challenge: ChallengeRoom;

  @OneToMany(() => WorkoutCert, (cert) => cert.challenge_participant, {
    cascade: true,
  })
  workout_cert: WorkoutCert[];

  @OneToMany(() => CertApproval, (approval) => approval.challenge_participant, {
    cascade: true,
  })
  cert_approval: CertApproval[];
}
