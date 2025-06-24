import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChallengeStatus } from '../enum/enum';
import { CertPhoto } from './cert_photo.entity';
import { ChallengeParticipant } from './challenge_participant.entity';
import { User } from './user.entity';

// 도전방 엔티티
@Entity({ name: 'challenge' })
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @ApiProperty({ description: '도전방 제목' })
  title: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: '도전방 설명', required: false })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @ApiProperty({ description: '도전 목표' })
  goal: string;

  @Column({ type: 'date', nullable: false })
  @ApiProperty({ description: '시작일' })
  start_date: Date;

  @Column({ type: 'date', nullable: false })
  @ApiProperty({ description: '종료일' })
  end_date: Date;

  @Column({ type: 'smallint', nullable: false })
  @ApiProperty({ description: '도전 기간(주 단위)' })
  duration_weeks: number;

  @Column({ type: 'smallint', nullable: false })
  @ApiProperty({ description: '최대 참가 인원' })
  max_participants: number;

  @Column({ type: 'boolean', default: true })
  @ApiProperty({ description: '공개 여부', default: true })
  is_public: boolean;

  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    default: ChallengeStatus.PENDING,
  })
  @ApiProperty({
    description: '도전방 상태',
    enum: ChallengeStatus,
    default: ChallengeStatus.PENDING,
  })
  status: ChallengeStatus;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성일시' })
  created_at: Date;

  // 관계 설정
  @OneToMany(() => CertPhoto, (certPhoto) => certPhoto.challenge)
  @ApiProperty({ type: () => [CertPhoto], description: '인증사진 엔티티' })
  cert_photos: CertPhoto[];

  @OneToMany(() => ChallengeParticipant, (participant) => participant.challenge)
  @ApiProperty({ type: () => [ChallengeParticipant], description: '도전자 엔티티' })
  challenge_participants: ChallengeParticipant[];

  @ManyToOne(() => User, (user) => user.challenges, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_idx' })
  @ApiProperty({ description: '유저 정보 (FK)' })
  user: User;
}
