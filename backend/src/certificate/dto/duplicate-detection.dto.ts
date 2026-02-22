import { IsString, IsEmail, IsOptional, IsUUID, IsEnum, IsBoolean, IsNumber, IsArray, Min, Max } from 'class-validator';
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

export class DuplicateCheckDto {
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
}

export class DuplicateRuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsBoolean()
  enabled: boolean;

  @IsEnum(['block', 'warn', 'allow'])
  action: 'block' | 'warn' | 'allow';

  @IsNumber()
  @Min(0)
  @Max(1)
  threshold: number;

  @IsArray()
  @IsEnum(['recipientEmail', 'recipientName', 'title', 'issuerId'], { each: true })
  checkFields: ('recipientEmail' | 'recipientName' | 'title' | 'issuerId')[];

  @IsBoolean()
  fuzzyMatching: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  timeWindow?: number;

  @IsNumber()
  @Min(1)
  priority: number;
}

export class DuplicateDetectionConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsEnum(['block', 'warn'])
  defaultAction: 'block' | 'warn';

  @IsArray()
  rules: DuplicateRuleDto[];

  @IsBoolean()
  allowOverride: boolean;

  @IsBoolean()
  requireAdminApproval: boolean;

  @IsBoolean()
  logDuplicates: boolean;
}

export class OverrideRequestDto {
  @IsUUID()
  certificateId: string;

  @IsString()
  reason: string;

  @IsString()
  requestedBy: string;
}

export class ApproveOverrideDto {
  @IsString()
  approvedBy: string;
}
