import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { PrivateChatMessage } from './private_chat_message.entity';

@Entity({ name: 'private_chat_room' })
@Index(['user1', 'user2'], { unique: true }) // 두 사용자 간에는 하나의 채팅방만 존재
export class PrivateChatRoom {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1_idx' })
  @ApiProperty({ description: '사용자 1' })
  user1: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2_idx' })
  @ApiProperty({ description: '사용자 2' })
  user2: User;

  @Column({ type: 'timestamp', nullable: true })
  @ApiProperty({ description: '마지막 메시지 시간', nullable: true })
  last_message_at?: Date;

  @Column({ type: 'text', nullable: true })
  @ApiProperty({ description: '마지막 메시지 내용', nullable: true })
  last_message?: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '사용자1 삭제 여부', default: false })
  user1_deleted: boolean;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '사용자2 삭제 여부', default: false })
  user2_deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '채팅방 생성일' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '채팅방 수정일' })
  updated_at: Date;

  // 관계 설정
  @OneToMany(() => PrivateChatMessage, (message) => message.chat_room)
  @ApiProperty({ type: () => [PrivateChatMessage], description: '메시지 목록' })
  messages: PrivateChatMessage[];
}
