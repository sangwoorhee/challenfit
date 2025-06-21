import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

// 인증사진 승인 엔티티
@Entity({ name: 'cert_approval' })
export class CertApproval {
  @PrimaryColumn({ type: 'uuid' })
  @ApiProperty({ description: 'PK - 고유 식별자' })
  idx: string;

  @Column({ type: 'uuid', nullable: false })
  @ApiProperty({ description: 'FK - 챌린지 참여 IDX' })
  challenge_participant_idx: string;

  @Column({ type: 'uuid', nullable: false })
  @ApiProperty({ description: 'FK - 운동 인증 IDX' })
  workout_cert_idx: string;

  @Column({ type: 'varchar', nullable: false })
  @ApiProperty({ description: '도장 이미지 URL' })
  stamp_img: string;

  @Column({ type: 'char', nullable: false })
  @ApiProperty({ description: '코멘트' })
  comment: string;

  @CreateDateColumn({ type: 'timestamp' })
  @ApiProperty({ description: '승인 생성일시', required: false })
  created_at: Date;
}
