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

  @ManyToOne(() => Certificate, { nullable: true })
  certificate: Certificate | null;

  @Column()
  success: boolean;

  @Column({ nullable: true })
  verificationCode?: string;

  @CreateDateColumn()
  verifiedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  verificationCode?: string | null;

  @Column({ type: 'text', nullable: true })
  metadata?: string | null;
}
