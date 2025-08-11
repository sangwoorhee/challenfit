import { ApiProperty } from '@nestjs/swagger';
import { CertApproval } from 'src/common/entities/cert_approval.entity';

export class CertApprovalDto {
  @ApiProperty({ description: 'PK - 고유 식별자' })
  idx: string;

  @ApiProperty({ description: '승인 생성일시' })
  created_at: Date;

  @ApiProperty({ description: '스탬프 이미지 URL' })
  stamp_img: string;

  @ApiProperty({ description: '승인한 사용자 정보' })
  user: {
    idx: string;
    nickname: string;
  };
}

export class CertApprovalResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '인증 승인 정보' })
  approval: CertApproval;
}

export class CertApprovalsResDto {
  @ApiProperty({ description: '결과' })
  result: string;

  @ApiProperty({ description: '인증 승인 목록' })
  approvals: CertApprovalDto[];
}