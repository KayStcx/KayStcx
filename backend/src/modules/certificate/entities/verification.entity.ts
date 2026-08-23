import { Certificate } from './certificate.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';

@Entity('verifications')
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable so that failed verification attempts (where no certificate could
  // be resolved from the supplied code) can still be persisted for auditing.
  @ManyToOne(() => Certificate, { nullable: true })
  certificate?: Certificate | null;

  @Column()
  success: boolean;

  @Column({ nullable: true })
  verificationCode?: string;

  @Column({ nullable: true })
  verifiedBy?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  verifiedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  verificationCode?: string | null;

  @Column({ type: 'text', nullable: true })
  metadata?: string | null;
}
