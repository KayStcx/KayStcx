import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('issuers')
export class Issuer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  publicKey: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}