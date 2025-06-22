import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity({ name: 'refresh_token' })
export class RefreshToken {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'PK' })
  idx: number;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'Refresh Token 값' })
  token: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '토큰 생성일' })
  created_at: Date;

  @ApiProperty({ description: '회원' })
  @OneToOne(() => User, (user) => user.refreshToken, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_idx' })
  user: User;
}