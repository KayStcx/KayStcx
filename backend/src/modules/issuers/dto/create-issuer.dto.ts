import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsEmail } from 'class-validator';
import { IssuerTier } from '../entities/issuer.entity';

export class CreateIssuerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  publicKey: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsEnum(IssuerTier)
  tier?: IssuerTier;
}
