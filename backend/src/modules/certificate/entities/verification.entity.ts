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

  // Nullable so failed verification attempts (where no certificate could be
  // resolved) can still be recorded for fraud/audit tracking.
  @ManyToOne(() => Certificate, { nullable: true })
  @JoinColumn({ name: 'certificateId' })
  certificate?: Certificate | null;

  @Column()
  success: boolean;

  @CreateDateColumn()
  verifiedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  verificationCode?: string | null;

  @Column({ type: 'text', nullable: true })
  metadata?: string | null;
}
