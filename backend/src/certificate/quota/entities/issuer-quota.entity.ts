import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('issuer_quotas')
export class IssuerQuota {
  @PrimaryGeneratedColumn('uuid')
  issuerId: string;

  @Column()
  monthlyLimit: number;

  @Column()
  yearlyLimit: number;

  @Column({ default: 80 })
  warningThreshold: number;

  @Column({ default: false })
  adminOverride: boolean;
}
