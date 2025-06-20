import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { LoginMethod } from '../enum/enum';
import { User } from './user.entity';

// 인증 로그 엔티티
@Entity({ name: 'auth_log' })
export class AuthLog {
  @PrimaryGeneratedColumn({ type: 'int' })
  @ApiProperty({ description: 'PK' })
  idx: number;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '로그인 시간' })
  login_time: Date;

  @Column({ type: 'enum', enum: LoginMethod })
  @ApiProperty({
    description: '로그인 방식',
    enum: LoginMethod,
  })
  login_method: LoginMethod;

  @Column({ type: 'varchar', length: 45 })
  @ApiProperty({ description: 'IP 주소' })
  ip_address: string;

  @Column({ type: 'text' })
  @ApiProperty({ description: 'User Agent 정보' })
  user_agent: string;

  // 관계 설정
  @ManyToOne(() => User, (user) => user.auth_logs, { onDelete: 'CASCADE' })
  @ApiProperty({ description: 'FK (유저 idx)' })
  @JoinColumn({ name: 'user_idx' })
  user: User;
}
