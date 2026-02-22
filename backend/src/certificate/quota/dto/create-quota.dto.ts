export class CreateQuotaDto {
  issuerId: string;
  monthlyLimit: number;
  yearlyLimit: number;
  warningThreshold?: number;
  adminOverride?: boolean;
}
