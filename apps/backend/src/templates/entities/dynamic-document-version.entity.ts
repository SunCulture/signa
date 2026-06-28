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
import { DynamicDocument } from './dynamic-document.entity';
import { TemplateFieldArea } from '../types/template-json';

@Entity('dynamic_document_versions')
@Index(['dynamicDocumentId', 'sha1'], { unique: true })
export class DynamicDocumentVersion {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ name: 'dynamic_document_id', type: 'bigint' })
  dynamicDocumentId!: string;

  @Column({ type: 'varchar', length: 255 })
  sha1!: string;

  @Column({ type: 'simple-json' })
  areas!: TemplateFieldArea[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => DynamicDocument, (document) => document.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'dynamic_document_id' })
  dynamicDocument!: DynamicDocument;
}
