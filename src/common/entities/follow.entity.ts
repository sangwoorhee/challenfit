import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'follow' })
@Unique(['follower', 'following']) // 중복 팔로우 방지
@Index(['follower', 'following']) // 조회 성능 향상
export class Follow {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '팔로우 일시' })
  created_at: Date;

  // 관계설정
  @ManyToOne(() => User, (user) => user.followers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_idx' })
  @ApiProperty({ description: '팔로워 (팔로우하는 사람)' })
  follower: User;

  @ManyToOne(() => User, (user) => user.followings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_idx' })
  @ApiProperty({ description: '팔로잉 (팔로우 받는 사람)' })
  following: User;
}