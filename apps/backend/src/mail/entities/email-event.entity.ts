import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_events')
@Index(['accountId', 'id'])
export class EmailEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId!: string | null;

  @Index()
  @Column({ name: 'email_message_id', type: 'bigint', nullable: true })
  emailMessageId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ name: 'event_datetime', type: 'timestamptz' })
  eventDatetime!: Date;

  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  messageId!: string | null;

  @Column({
    name: 'emailable_type',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  emailableType!: string | null;

  @Column({ name: 'emailable_id', type: 'bigint', nullable: true })
  emailableId!: string | null;

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
