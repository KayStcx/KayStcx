import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateResponseDto } from './certificate-response.dto';

export class VerificationHistoryResponseDto {
  @ApiProperty({
    description: 'Verification record UUID',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ description: 'Whether the verification succeeded' })
  success: boolean;

  @ApiProperty({ description: 'Verification timestamp' })
  verifiedAt: Date;

  @ApiPropertyOptional({
    description: 'Certificate that was verified',
    type: CertificateResponseDto,
  })
  certificate?: CertificateResponseDto;
}
