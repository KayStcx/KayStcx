import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ProposalType = 'parameter' | 'upgrade' | 'treasury' | 'general';
export type ProposalStatus = 'pending' | 'active' | 'queued' | 'executed' | 'rejected' | 'expired';

@Entity('governance_proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['parameter', 'upgrade', 'treasury', 'general'] })
  type: ProposalType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ['pending', 'active', 'queued', 'executed', 'rejected', 'expired'], default: 'pending' })
  status: ProposalStatus;

  @Column({ type: 'jsonb', nullable: true })
  actions: any;

  @Column({ type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  executionTime: Date;

  @Column({ nullable: true })
  proposer: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
