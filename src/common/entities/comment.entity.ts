import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { WorkoutCert } from './workout-cert.entity';
import { Like } from './like.entity';

// 댓글 엔티티: 운동 인증에 대한 댓글 정보를 저장
@Entity({ name: 'comment' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK - 고유 식별자', format: 'uuid' })
  idx: string;

  @Column({ type: 'text', nullable: false })
  @ApiProperty({ description: '댓글 내용' })
  content: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '생성일시' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '수정일시' })
  updated_at: Date;

  // 관계설정  
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @ApiProperty({ description: 'FK - 사용자 ID' }) // 사용자: 댓글을 작성한 사용자
  user: User;

  @ManyToOne(() => WorkoutCert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_cert_idx' })
  @ApiProperty({ description: 'FK - 운동 인증 ID' }) // 운동 인증: 댓글이 대상인 운동 인증
  workout_cert: WorkoutCert;

  @OneToMany(() => Like, (likes) => likes.comment, { cascade: true })
  @ApiProperty({ type: () => [Like], description: '이 인증에 달린 좋아요들' })
  likes: Like[];
}