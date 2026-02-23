import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ExportFormat = 'pdf' | 'csv' | 'json';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportType = 'single' | 'bulk';

@Entity('export_jobs')
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requesterEmail: string;

  @Column({ nullable: true })
  certificateId?: string;

  @Column({ type: 'enum', enum: ['pdf', 'csv', 'json'] })
  format: ExportFormat;

  @Column({ type: 'enum', enum: ['single', 'bulk'] })
  type: ExportType;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: ExportStatus;

  @Column({ type: 'jsonb', nullable: true })
  filters?: {
    status?: string;
    from?: string;
    to?: string;
    issuerId?: string;
  };

  @Column({ nullable: true })
  filePath?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
