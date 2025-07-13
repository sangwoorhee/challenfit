
import { ApiProperty } from '@nestjs/swagger';

export class CommonResDto {
  @ApiProperty({ description: '응답 메시지' })
  message: string;
}
