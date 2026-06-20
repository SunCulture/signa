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
import { Account } from '../../accounts/entities/account.entity';
import { Submitter } from '../../submitters/entities/submitter.entity';
import type { SubmissionEventData } from '../types/submission-json';
import { Submission } from './submission.entity';

@Entity('submission_events')
export class SubmissionEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId!: string | null;

  @Index()
  @Column({ name: 'submission_id', type: 'bigint' })
  submissionId!: string;

  @Index()
  @Column({ name: 'submitter_id', type: 'bigint', nullable: true })
  submitterId!: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType!: string;

  @Column({ name: 'event_timestamp', type: 'timestamptz' })
  eventTimestamp!: Date;

  @Column({ type: 'simple-json' })
  data!: SubmissionEventData;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account | null;

  @ManyToOne(() => Submission, (submission) => submission.submissionEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission!: Submission;

  @ManyToOne(() => Submitter, (submitter) => submitter.submissionEvents, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submitter_id' })
  submitter!: Submitter | null;
}
