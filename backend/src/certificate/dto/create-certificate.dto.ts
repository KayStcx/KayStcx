import { IsString, IsEmail, IsOptional, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCertificateDto {
  @IsUUID()
  issuerId: string;

  @IsEmail()
  recipientEmail: string;

  @IsString()
  recipientName: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  verificationCode?: string;

  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @IsOptional()
  metadata?: Record<string, any>;
}
