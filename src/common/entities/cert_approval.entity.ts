import { Entity, PrimaryColumn, Column, CreateDateColumn, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';
import { WorkoutCert } from './workout-cert.entity';

// 인증 승인 엔티티
@Entity({ name: 'cert_approval' })
export class CertApproval {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK - 고유 식별자', format: 'uuid' })
  idx: string;

  @Column({ type: 'uuid', nullable: false })
  @ApiProperty({ description: 'FK - 챌린지 참여 IDX' })
  challenge_participant_idx: string;

  @Column({ type: 'uuid', nullable: false })
  @ApiProperty({ description: 'FK - 운동 인증 IDX' })
  workout_cert_idx: string;

  @Column({ type: 'varchar', nullable: false })
  @ApiProperty({ description: '도장 이미지 URL' })
  stamp_img: string;

  @Column({ type: 'varchar', nullable: false })
  @ApiProperty({ description: '코멘트' })
  comment: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '승인 생성일시', required: false })
  created_at: Date;

  // 관계설정
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: 'FK - 사용자 ID' })
  user: User;

  @ManyToOne(() => WorkoutCert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_cert_id' })
  @ApiProperty({ description: 'FK - 운동 인증 ID' })
  workout_cert: WorkoutCert;
}
