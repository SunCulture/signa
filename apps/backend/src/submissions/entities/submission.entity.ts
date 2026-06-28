import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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
import { Submitter } from '../../submitters/entities/submitter.entity';
import { Template } from '../../templates/entities/template.entity';
import { User } from '../../users/entities/user.entity';
import type {
  SubmissionPreferences,
  SubmissionTemplateField,
  SubmissionTemplateSchemaItem,
  SubmissionTemplateSubmitter,
  SubmissionVariables,
  SubmissionVariablesSchema,
} from '../types/submission-json';
import { SubmissionEvent } from './submission-event.entity';

@Entity('submissions')
@Index(['accountId', 'id'])
@Index(['accountId', 'templateId', 'id'])
export class Submission {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'created_by_user_id', type: 'bigint', nullable: true })
  createdByUserId!: string | null;

  @Index()
  @Column({ name: 'template_id', type: 'bigint', nullable: true })
  templateId!: string | null;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
  })
  slug: string = uuidv4();

  @Column({ type: 'varchar', length: 255 })
  source!: string;

  @Column({ name: 'submitters_order', type: 'varchar', length: 255 })
  submittersOrder!: string;

  @Column({ type: 'simple-json' })
  preferences!: SubmissionPreferences;

  @Column({ name: 'template_fields', type: 'simple-json', nullable: true })
  templateFields!: SubmissionTemplateField[] | null;

  @Column({ name: 'template_schema', type: 'simple-json', nullable: true })
  templateSchema!: SubmissionTemplateSchemaItem[] | null;

  @Column({ name: 'template_submitters', type: 'simple-json', nullable: true })
  templateSubmitters!: SubmissionTemplateSubmitter[] | null;

  @Column({ type: 'simple-json', nullable: true })
  variables!: SubmissionVariables | null;

  @Column({ name: 'variables_schema', type: 'simple-json', nullable: true })
  variablesSchema!: SubmissionVariablesSchema | null;

  @Column({ name: 'expire_at', type: Date, nullable: true })
  expireAt!: Date | null;

  @DeleteDateColumn({ name: 'archived_at', type: Date, nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User | null;

  @ManyToOne(() => Template, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'template_id' })
  template!: Template | null;

  @OneToMany(() => Submitter, (submitter) => submitter.submission)
  submitters!: Submitter[];

  @OneToMany(() => SubmissionEvent, (event) => event.submission)
  submissionEvents!: SubmissionEvent[];
}
