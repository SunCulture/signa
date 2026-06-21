import {
  BeforeInsert,
  BeforeUpdate,
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
import { createHash, randomUUID } from 'node:crypto';
import { Template } from './template.entity';
import { DynamicDocumentVersion } from './dynamic-document-version.entity';

@Entity('dynamic_documents')
@Index(['templateId'])
export class DynamicDocument {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'text', nullable: true })
  head!: string | null;

  @Column({ type: 'varchar', length: 255 })
  sha1!: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  uuid!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Template, (template) => template.dynamicDocuments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: Template;

  @OneToMany(() => DynamicDocumentVersion, (version) => version.dynamicDocument)
  versions!: DynamicDocumentVersion[];

  @BeforeInsert()
  setInitialValues(): void {
    this.uuid ||= randomUUID();
    this.setSha1();
  }

  @BeforeUpdate()
  setSha1(): void {
    this.sha1 = createHash('sha1').update(this.body).digest('hex');
  }
}
