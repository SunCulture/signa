import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Submitter } from '../../submitters/entities/submitter.entity';

@Entity('completed_documents')
export class CompletedDocument {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  sha256!: string;

  @Index()
  @Column({ name: 'submitter_id', type: 'bigint' })
  submitterId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Submitter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitter_id' })
  submitter!: Submitter;
}
