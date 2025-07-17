// challenfit_backend>src>common>entities>follow_request.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Column,
} from 'typeorm';
import { User } from './user.entity';
import { FollowRequestStatus } from '../enum/enum';


@Entity({ name: 'follow_request' })
@Unique(['requester', 'requested']) // 중복 요청 방지
@Index(['requester', 'requested', 'status']) // 조회 성능 향상
export class FollowRequest {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'enum', enum: FollowRequestStatus, default: FollowRequestStatus.PENDING })
  @ApiProperty({ description: '요청 상태', enum: FollowRequestStatus })
  status: FollowRequestStatus;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '요청 일시' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '업데이트 일시' })
  updated_at: Date;

  // 관계설정
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_idx' })
  @ApiProperty({ description: '요청자 (팔로우 신청한 사람)' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_idx' })
  @ApiProperty({ description: '요청받은 사람 (팔로우 신청받은 사람)' })
  requested: User;
}