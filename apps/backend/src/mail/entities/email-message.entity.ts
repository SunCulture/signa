import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_messages')
@Index(['accountId', 'id'])
export class EmailMessage {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId!: string | null;

  @Index()
  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  messageId!: string | null;

  @Index()
  @Column({ name: 'submission_id', type: 'bigint', nullable: true })
  submissionId!: string | null;

  @Index()
  @Column({ name: 'submitter_id', type: 'bigint', nullable: true })
  submitterId!: string | null;

  @Column({ name: 'job_id', type: 'varchar', length: 255, nullable: true })
  jobId!: string | null;

  @Column({ type: 'int', default: 1 })
  attempt!: number;

  @Column({ type: 'varchar', length: 255 })
  template!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  recipients!: string;

  @Column({ type: 'text', nullable: true })
  sender!: string | null;

  @Column({ type: 'varchar', length: 64 })
  sha1!: string;

  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ name: 'last_error_message', type: 'text', nullable: true })
  lastErrorMessage!: string | null;

  @Column({ name: 'last_error_stack', type: 'text', nullable: true })
  lastErrorStack!: string | null;

  @Column({ name: 'provider_response', type: 'text', nullable: true })
  providerResponse!: string | null;

  @Column({ name: 'queued_at', type: 'timestamp', nullable: true })
  queuedAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'skipped_at', type: 'timestamp', nullable: true })
  skippedAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt!: Date | null;

  @Column({ type: 'simple-json' })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
