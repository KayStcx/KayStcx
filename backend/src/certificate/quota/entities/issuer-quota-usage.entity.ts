import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('issuer_quota_usage')
export class IssuerQuotaUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  issuerId: string;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ default: 0 })
  issuedCount: number;
}
