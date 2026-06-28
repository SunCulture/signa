import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Account } from '../../accounts/entities/account.entity';
import type {
  SubmitterMetadata,
  SubmitterPreferences,
  SubmitterValues,
} from '../../submissions/types/submission-json';
import { SubmissionEvent } from '../../submissions/entities/submission-event.entity';
import { Submission } from '../../submissions/entities/submission.entity';

@Entity('submitters')
@Index(['accountId', 'id'])
export class Submitter {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'submission_id', type: 'bigint' })
  submissionId!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
  })
  uuid: string = uuidv4();

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
  })
  slug: string = uuidv4();

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone!: string | null;

  @Index()
  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({ type: 'simple-json' })
  metadata!: SubmitterMetadata;

  @Column({ type: 'simple-json' })
  preferences!: SubmitterPreferences;

  @Column({ type: 'simple-json' })
  values!: SubmitterValues;

  @Column({ name: 'sent_at', type: Date, nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'opened_at', type: Date, nullable: true })
  openedAt!: Date | null;

  @Column({ name: 'completed_at', type: Date, nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'declined_at', type: Date, nullable: true })
  declinedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  timezone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ua!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => Submission, (submission) => submission.submitters, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission!: Submission;

  @OneToMany(() => SubmissionEvent, (event) => event.submitter)
  submissionEvents!: SubmissionEvent[];
}
