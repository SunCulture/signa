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

export type DocumentGenerationEventName =
  | 'start'
  | 'complete'
  | 'fail'
  | 'retry';

@Entity('document_generation_events')
@Index(['submitterId', 'eventName'])
export class DocumentGenerationEvent {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'submitter_id', type: 'bigint' })
  submitterId!: string;

  @Column({ name: 'event_name', type: 'varchar', length: 255 })
  eventName!: DocumentGenerationEventName;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Submitter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitter_id' })
  submitter!: Submitter;
}
