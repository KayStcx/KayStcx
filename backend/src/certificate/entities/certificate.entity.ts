import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  issuerId: string;

  @Column({ type: 'enum', enum: ['active', 'revoked', 'expired'] })
  status: string;

  @CreateDateColumn()
  issuedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

//   @ManyToOne(() => Issuer, (issuer) => issuer.certificates)
//   issuer: Issuer;
}
