import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { StorageAttachment } from './storage-attachment.entity';

@Entity('active_storage_blobs')
export class StorageBlob {
  @PrimaryGeneratedColumn()
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

  @Index('IDX_active_storage_blobs_sha256')
  @Column({ type: 'varchar', length: 43, nullable: true })
  sha256!: string | null;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
  })
  uuid: string = uuidv4();

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => StorageAttachment, (attachment) => attachment.blob)
  attachments!: StorageAttachment[];
}
