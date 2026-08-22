import { ApiProperty } from '@nestjs/swagger';

export class CertificateQrResponseDto {
  @ApiProperty({
    example: 'a3d8a582-bd23-4a2d-9630-6d4a2f5fd6f0',
    description: 'Certificate identifier',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    example: 'AB12CD34',
    description: 'Certificate verification code encoded in the QR payload',
  })
  verificationCode: string;

  @ApiProperty({
    example: 'data:image/png;base64,iVBORw0KGgo...',
    description: 'Base64 data URL of the generated QR code',
  })
  qrCode: string;

  @ApiProperty({
    example: 'https://kaystcx.app/verify?serial=AB12CD34',
    description: 'Public verification URL encoded into the QR code',
  })
  verificationUrl: string;
}
