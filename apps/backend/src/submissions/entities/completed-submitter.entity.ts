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
import { Template } from '../../templates/entities/template.entity';
import { Submission } from './submission.entity';

@Entity('completed_submitters')
@Index(['accountId', 'completedAt'])
@Index(['submitterId'], { unique: true })
export class CompletedSubmitter {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'submission_id', type: 'bigint' })
  submissionId!: string;

  @Column({ name: 'submitter_id', type: 'bigint' })
  submitterId!: string;

  @Index()
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz' })
  completedAt!: Date;

  @Column({ name: 'is_first', type: 'boolean', nullable: true })
  isFirst!: boolean | null;

  @Column({ name: 'sms_count', type: 'integer', default: 0 })
  smsCount!: number;

  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({
    name: 'verification_method',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  verificationMethod!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
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

  @ManyToOne(() => Template, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template!: Template | null;
}
