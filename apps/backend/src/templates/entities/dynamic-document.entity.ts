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
import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { Template } from './template.entity';
import { DynamicDocumentVersion } from './dynamic-document-version.entity';

@Entity('dynamic_documents')
@Index(['templateId'])
export class DynamicDocument {
  @PrimaryGeneratedColumn()
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
  uuid: string = uuidv4();

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
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
    this.setSha1();
  }

  @BeforeUpdate()
  setSha1(): void {
    this.sha1 = createHash('sha1').update(this.body).digest('hex');
  }
}
