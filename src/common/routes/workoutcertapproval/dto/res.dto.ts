import { ApiProperty } from '@nestjs/swagger';
import { CertApproval } from 'src/common/entities/cert_approval.entity';

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
  approvals: CertApproval[];
}