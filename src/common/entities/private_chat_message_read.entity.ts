import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { PrivateChatMessage } from './private_chat_message.entity';

@Entity({ name: 'private_chat_message_read' })
@Index(['user', 'message'], { unique: true }) // 사용자별 메시지 읽음은 하나만
export class PrivateChatMessageRead {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '읽은 시간' })
  read_at: Date;

  // 관계 설정
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_idx' })
  @ApiProperty({ description: '읽은 사용자' })
  user: User;

  @ManyToOne(() => PrivateChatMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_idx' })
  @ApiProperty({ description: '읽은 메시지' })
  message: PrivateChatMessage;
}
