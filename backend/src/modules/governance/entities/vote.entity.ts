import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Proposal } from './proposal.entity';

@Entity('governance_votes')
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Proposal)
  proposal: Proposal;

  @Column()
  voter: string; // address or user id

  @Column({ type: 'float' })
  weight: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
