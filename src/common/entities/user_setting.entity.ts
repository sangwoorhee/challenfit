import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity({ name: 'user_setting' })
export class UserSetting {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'PK', format: 'uuid' })
  idx: string;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '마케팅 수신 동의' })
  marketing_opt_in: boolean;

  @Column({ type: 'boolean', default: false })
  @ApiProperty({ description: '푸시 알림 거부' })
  no_push_alert: boolean;

  @OneToOne(() => User, (user) => user.setting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_idx' })
  user: User;
}
