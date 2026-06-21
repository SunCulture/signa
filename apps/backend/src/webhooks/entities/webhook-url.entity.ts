import { createHash } from 'node:crypto';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { generateWebhookSecret } from '../webhook-signatures';
import { WebhookEvent } from './webhook-event.entity';

@Entity('webhook_urls')
@Index(['accountId'])
@Index(['sha1'])
export class WebhookUrl {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'jsonb' })
  events!: string[];

  @Column({ type: 'jsonb' })
  secret!: Record<string, string>;

  @Column({ name: 'hmac_secret', type: 'text' })
  hmacSecret!: string;

  @Column({ type: 'varchar', length: 64 })
  sha1!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => WebhookEvent, (event) => event.webhookUrl)
  webhookEvents!: WebhookEvent[];

  @BeforeInsert()
  setDefaults(): void {
    this.events ||= [];
    this.secret ||= {};
    this.hmacSecret ||= generateWebhookSecret();
    this.updateSha1();
  }

  @BeforeUpdate()
  updateSha1(): void {
    this.sha1 = createHash('sha1').update(this.url).digest('hex');
  }
}
