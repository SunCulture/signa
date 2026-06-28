import { v4 as uuidv4 } from 'uuid';
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
import { WebhookAttempt } from './webhook-attempt.entity';
import { WebhookUrl } from './webhook-url.entity';

export type WebhookDeliveryStatus = 'pending' | 'success' | 'error';

@Entity('webhook_events')
@Index(['webhookUrlId', 'id'])
@Index(['webhookUrlId', 'uuid'], { unique: true })
@Index(['accountId'])
export class WebhookEvent {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ name: 'webhook_url_id', type: 'bigint' })
  webhookUrlId!: string;

  @Column({ type: 'varchar', length: 255 })
  uuid: string = uuidv4();

  @Column({ name: 'event_type', type: 'varchar', length: 255 })
  eventType!: string;

  @Column({ name: 'record_type', type: 'varchar', length: 255 })
  recordType!: string;

  @Column({ name: 'record_id', type: 'bigint' })
  recordId!: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: WebhookDeliveryStatus;

  @Column({ type: 'simple-json', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => WebhookUrl, (url) => url.webhookEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'webhook_url_id' })
  webhookUrl!: WebhookUrl;

  @OneToMany(() => WebhookAttempt, (attempt) => attempt.webhookEvent)
  attempts!: WebhookAttempt[];
}
