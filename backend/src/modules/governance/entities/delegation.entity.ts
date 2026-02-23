import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('governance_delegations')
export class Delegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  delegator: string; // address or user id

  @Column()
  delegatee: string; // address or user id

  @Column({ type: 'float' })
  weight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
