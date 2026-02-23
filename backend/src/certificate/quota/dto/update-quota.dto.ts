export class UpdateQuotaDto {
  monthlyLimit?: number;
  yearlyLimit?: number;
  warningThreshold?: number;
  adminOverride?: boolean;
}
