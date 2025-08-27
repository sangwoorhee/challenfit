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
} from 'typeorm';
import { User } from './user.entity';
import { PrivateChatRoom } from './private_chat_room.entity';
import { PrivateChatMessageRead } from './private_chat_message_read.entity';
import { ChatMessageType } from '../enum/enum';

@Entity({ name: 'private_chat_message' })
@Index(['chat_room', 'created_at']) // 채팅방별 메시지 조회 최적화
@Index(['sender', 'created_at']) // 사용자별 메시지 조회 최적화
export class PrivateChatMessage {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'text' })
  @ApiProperty({ description: '메시지 내용' })
  message: string;

  @Column({ 
    type: 'enum', 
    enum: ChatMessageType, 
    default: ChatMessageType.TEXT 
  })
  @ApiProperty({ 
    description: '메시지 타입', 
    enum: ChatMessageType,
    default: ChatMessageType.TEXT 
  })
  message_type: ChatMessageType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @ApiProperty({ description: '첨부 파일 URL', nullable: true })
  attachment_url?: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '삭제 여부', default: false })
  is_deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '전송 시간' })
  created_at: Date;

  // 관계 설정
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_idx' })
  @ApiProperty({ description: '발신자' })
  sender: User;

  @ManyToOne(() => PrivateChatRoom, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_room_idx' })
  @ApiProperty({ description: '채팅방' })
  chat_room: PrivateChatRoom;

  @OneToMany(() => PrivateChatMessageRead, (read) => read.message)
  @ApiProperty({ type: () => [PrivateChatMessageRead], description: '읽음 상태 목록' })
  reads: PrivateChatMessageRead[];
}
