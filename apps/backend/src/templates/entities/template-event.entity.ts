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
import { User } from '../../users/entities/user.entity';
import { Template } from './template.entity';

@Entity('template_events')
@Index(['templateId', 'eventTimestamp'])
export class TemplateEvent {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType!: string;

  @Column({ type: 'varchar', length: 255 })
  summary!: string;

  @Column({ name: 'event_timestamp' })
  eventTimestamp!: Date;

  @Column({ type: 'simple-json' })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => Template, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template!: Template;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
