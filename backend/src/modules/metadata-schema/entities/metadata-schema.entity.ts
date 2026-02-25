import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  ENUM = 'enum',
  ARRAY = 'array',
  OBJECT = 'object',
}

export interface SchemaField {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enumValues?: string[];
  default?: any;
  items?: SchemaField;
  properties?: SchemaField[];
}

@Entity('metadata_schemas')
export class MetadataSchema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  @Index()
  version: string;

  @Column({ type: 'jsonb' })
  fields: SchemaField[];

  @Column({ type: 'jsonb', nullable: true })
  requiredFields: string[];

  @Column({ default: true })
  allowCustomFields: boolean;

  @Column({ nullable: true })
  @Index()
  issuerId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  previousVersionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
