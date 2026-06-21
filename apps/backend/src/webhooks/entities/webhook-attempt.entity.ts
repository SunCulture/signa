import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WebhookEvent } from './webhook-event.entity';

@Entity('webhook_attempts')
@Index(['webhookEventId', 'id'])
export class WebhookAttempt {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'webhook_event_id', type: 'bigint' })
  webhookEventId!: string;

  @Column({ type: 'integer', default: 0 })
  attempt!: number;

  @Column({ name: 'response_status_code', type: 'integer', default: 0 })
  responseStatusCode!: number;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => WebhookEvent, (event) => event.attempts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'webhook_event_id' })
  webhookEvent!: WebhookEvent;
}
