import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('governance_treasury')
export class Treasury {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  asset: string; // token or asset identifier

  @Column({ type: 'float' })
  balance: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
