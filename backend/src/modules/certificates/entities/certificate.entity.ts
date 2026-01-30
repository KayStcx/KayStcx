import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  certificateId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column()
  issuerName: string;

  @Column()
  recipientEmail: string;

  @Column({ nullable: true })
  recipientPublicKey?: string;

  @Column({ type: 'timestamp', nullable: true })
  issuedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ type: 'text', nullable: true })
  revocationReason?: string;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ nullable: true })
  revokedBy?: string;

  @Column({ nullable: true })
  blockchainTxHash?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}