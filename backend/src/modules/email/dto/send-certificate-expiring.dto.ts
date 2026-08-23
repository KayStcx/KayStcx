import { IsEmail, IsString, IsDateString } from 'class-validator';

export class SendCertificateExpiringDto {
  @IsEmail()
  to: string;

  @IsString()
  certificateId: string;

  @IsString()
  recipientName: string;

  @IsString()
  certificateName: string;

  @IsDateString()
  expiryDate: string;
}