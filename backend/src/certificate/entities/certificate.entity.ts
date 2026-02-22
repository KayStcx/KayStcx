import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  issuerId: string;

  @Column()
  @Index()
  recipientEmail: string;

  @Column()
  @Index()
  recipientName: string;

  @Column()
  @Index()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ['active', 'revoked', 'expired'] })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  stellarTransactionId: string;

  @Column({ nullable: true })
  verificationCode: string;

  @Column({ default: false })
  isDuplicate: boolean;

  @Column({ nullable: true })
  duplicateOfId: string;

  @Column({ nullable: true })
  overrideReason: string;

  @Column({ nullable: true })
  overriddenBy: string;

  @CreateDateColumn()
  issuedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

//   @ManyToOne(() => Issuer, (issuer) => issuer.certificates)
//   issuer: Issuer;
}
