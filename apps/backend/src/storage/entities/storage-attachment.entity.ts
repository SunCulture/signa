import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { StorageBlob } from './storage-blob.entity';

@Entity('active_storage_attachments')
@Index(['recordType', 'recordId', 'name', 'blobId'])
export class StorageAttachment {
  @PrimaryGeneratedColumn()
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
  })
  uuid: string = uuidv4();

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => StorageBlob, (blob) => blob.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blob_id' })
  blob!: StorageBlob;
}
