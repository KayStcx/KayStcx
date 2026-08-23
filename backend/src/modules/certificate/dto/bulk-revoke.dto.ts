import {
  IsArray,
  ArrayNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CertificateResponseDto } from './certificate-response.dto';

export class BulkRevokeDto {
  @ApiProperty({
    description: 'List of certificate IDs to revoke',
    type: [String],
    example: ['a3d8a582-bd23-4a2d-9630-6d4a2f5fd6f0'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  certificateIds: string[];

  @ApiPropertyOptional({
    description: 'Reason for revoking the certificates',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason?: string;
}

export class BulkRevokeFailureDto {
  @ApiProperty({
    description: 'Certificate ID that failed to revoke',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ description: 'Error explaining why revocation failed' })
  error: string;
}

export class BulkRevokeResponseDto {
  @ApiProperty({
    description: 'Certificates that were successfully revoked',
    type: [CertificateResponseDto],
  })
  revoked: CertificateResponseDto[];

  @ApiProperty({
    description: 'Certificates that could not be revoked',
    type: [BulkRevokeFailureDto],
  })
  failed: BulkRevokeFailureDto[];
}
