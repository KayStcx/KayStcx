import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StellarTransactionResponseDto {
  @ApiPropertyOptional({ description: 'Stellar transaction hash' })
  stellarTransactionHash?: string;

  @ApiPropertyOptional({ description: 'Legacy Stellar transaction ID' })
  stellarTransactionId?: string;

  @ApiPropertyOptional({ description: 'Stellar transaction memo' })
  stellarMemo?: string;

  @ApiPropertyOptional({ description: 'Stellar transaction sequence number' })
  stellarSequenceNumber?: string;

  @ApiProperty({ description: 'Certificate issuance timestamp' })
  issuedAt: Date;
}
