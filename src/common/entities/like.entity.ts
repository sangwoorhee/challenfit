import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { WorkoutCert } from './workout-cert.entity';

// 좋아요 엔티티: 운동 인증에 대한 좋아요 정보를 저장
@Entity({ name: 'like' })
export class Like {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK - 고유 식별자', format: 'uuid' })
  idx: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성일시' })
  created_at: Date;

  // 관계 설정
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: 'FK - 사용자 ID' })
  user: User; // 사용자: 좋아요를 누른 사용자

  @ManyToOne(() => WorkoutCert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_cert_id' })
  @ApiProperty({ description: 'FK - 운동 인증 ID' })
  workout_cert: WorkoutCert; // 운동 인증: 좋아요가 대상인 운동 인증
}