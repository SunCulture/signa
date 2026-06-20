import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StorageAttachment } from './storage-attachment.entity';

@Entity('active_storage_blobs')
export class StorageBlob {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  contentType!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'service_name', type: 'varchar', length: 255 })
  serviceName!: string;

  @Column({ name: 'byte_size', type: 'bigint' })
  byteSize!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  checksum!: string | null;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    default: () => '(gen_random_uuid())',
  })
  uuid!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => StorageAttachment, (attachment) => attachment.blob)
  attachments!: StorageAttachment[];
}
