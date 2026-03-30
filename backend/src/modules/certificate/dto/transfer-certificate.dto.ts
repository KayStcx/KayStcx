import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateTransferDto {
  @ApiProperty({ description: 'ID of the certificate to transfer' })
  @IsString()
  @IsNotEmpty()
  certificateId: string;

  @ApiProperty({ description: 'Email of the new owner' })
  @IsEmail()
  @IsNotEmpty()
  newOwnerEmail: string;

  @ApiProperty({ description: 'Name of the new owner' })
  @IsString()
  @IsNotEmpty()
  newOwnerName: string;

  @ApiPropertyOptional({ description: 'Reason for the transfer' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ApproveTransferDto {
  @ApiProperty({ description: 'Transfer request ID' })
  @IsString()
  @IsNotEmpty()
  transferId: string;

  @ApiPropertyOptional({
    description: 'Confirmation code sent to the new owner',
  })
  @IsString()
  @IsOptional()
  confirmationCode?: string;
}

export class RejectTransferDto {
  @ApiProperty({ description: 'Transfer request ID' })
  @IsString()
  @IsNotEmpty()
  transferId: string;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class TransferHistoryResponseDto {
  id: string;
  certificateId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  status: string;
  reason?: string;
  rejectionReason?: string;
  initiatedAt: Date;
  completedAt?: Date;
}
