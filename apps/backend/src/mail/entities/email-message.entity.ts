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
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId!: string | null;

  @Index()
  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  messageId!: string | null;

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

  @Column({ type: 'jsonb' })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
