import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity({ name: 'user_profile' })
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'date', nullable: true })
  @ApiProperty({ description: '생년월일', required: false })
  birth_date?: Date;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ description: '키', required: false })
  height?: number;

  @Column({ type: 'int', nullable: true })
  @ApiProperty({ description: '몸무게', required: false })
  weight?: number;

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '관심 운동', required: false })
  interest_exercises?: string;

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '운동 목적', required: false })
  exercise_purpose?: string;

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '자기소개', required: false })
  introduction?: string;

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ description: '프로필 이미지 URL', required: false })
  profile_image_url?: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_idx' })
  user: User;
}
