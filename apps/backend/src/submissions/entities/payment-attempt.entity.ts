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
import { Submission } from './submission.entity';

export type PaymentAttemptStatus =
  | 'requires_provider'
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

@Entity('payment_attempts')
@Index(['accountId', 'submissionId'])
@Index(['submitterId', 'fieldUuid'])
export class PaymentAttempt {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'submission_id', type: 'bigint' })
  submissionId!: string;

  @Index()
  @Column({ name: 'submitter_id', type: 'bigint' })
  submitterId!: string;

  @Column({ name: 'field_uuid', type: 'varchar', length: 255 })
  fieldUuid!: string;

  @Column({ type: 'varchar', length: 64, default: 'requires_provider' })
  status!: PaymentAttemptStatus;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider!: string | null;

  @Column({
    name: 'provider_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerReference!: string | null;

  @Column({ type: 'integer', nullable: true })
  amount!: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  currency!: string | null;

  @Column({ type: 'simple-json' })
  data!: Record<string, unknown>;

  @Column({ name: 'completed_at', type: Date, nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submission_id' })
  submission!: Submission;

  @ManyToOne(() => Submitter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submitter_id' })
  submitter!: Submitter;
}
