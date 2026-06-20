import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StorageBlob } from './storage-blob.entity';

@Entity('active_storage_attachments')
@Index(['recordType', 'recordId', 'name', 'blobId'])
export class StorageAttachment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'record_type', type: 'varchar', length: 255 })
  recordType!: string;

  @Column({ name: 'record_id', type: 'bigint' })
  recordId!: string;

  @Column({ name: 'blob_id', type: 'bigint' })
  blobId!: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 255,
    default: () => '(gen_random_uuid())',
  })
  uuid!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => StorageBlob, (blob) => blob.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blob_id' })
  blob!: StorageBlob;
}
