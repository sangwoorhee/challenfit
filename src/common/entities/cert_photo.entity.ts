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
// import { ChallengeRoom } from './challenge_room.entity';

// 인증사진 엔티티
@Entity({ name: 'cert_photo' })
export class CertPhoto {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK' })
  idx: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @ApiProperty({ description: '이미지 URL' })
  image_url: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: '캡션', required: false })
  caption?: string;

  @Column({ type: 'date', nullable: false })
  @ApiProperty({ description: '촬영일' })
  taken_date: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '휴식 여부', default: false })
  is_rest: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성일시' })
  created_at: Date;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.cert_photos, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;

  // @ManyToOne(() => ChallengeRoom, (challenge) => challenge.cert_photos, { onDelete: 'CASCADE' })
  // @ApiProperty({ description: 'FK (챌린지 idx)' })
  // @JoinColumn({ name: 'challenge_room_idx' })
  // challenge: ChallengeRoom;
}
