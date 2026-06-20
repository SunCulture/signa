import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import { User } from '../../users/entities/user.entity';
import { TemplateAccess } from './template-access.entity';
import { TemplateFolder } from './template-folder.entity';
import { TemplateSharing } from './template-sharing.entity';
import { TemplateVersion } from './template-version.entity';
import type {
  TemplateField,
  TemplatePreferences,
  TemplateSchemaItem,
  TemplateSubmitter,
  TemplateVariablesSchema,
} from '../types/template-json';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'author_id', type: 'bigint' })
  authorId!: string;

  @Index()
  @Column({ name: 'folder_id', type: 'bigint' })
  folderId!: string;

  @Index()
  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({ type: 'simple-json' })
  fields!: TemplateField[];

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'simple-json' })
  preferences!: TemplatePreferences;

  @Column({ type: 'simple-json' })
  schema!: TemplateSchemaItem[];

  @Column({ name: 'shared_link', type: 'boolean', default: false })
  sharedLink!: boolean;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    default: () => '(gen_random_uuid())',
  })
  slug!: string;

  @Column({ type: 'text', default: 'native' })
  source!: string;

  @Column({ type: 'simple-json' })
  submitters!: TemplateSubmitter[];

  @Column({ name: 'variables_schema', type: 'simple-json', nullable: true })
  variablesSchema!: TemplateVariablesSchema | null;

  @DeleteDateColumn({
    name: 'archived_at',
    type: 'timestamptz',
    nullable: true,
  })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @ManyToOne(() => TemplateFolder, (folder) => folder.templates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'folder_id' })
  folder!: TemplateFolder;

  @OneToMany(() => TemplateAccess, (access) => access.template)
  accesses!: TemplateAccess[];

  @OneToMany(() => TemplateSharing, (sharing) => sharing.template)
  sharings!: TemplateSharing[];

  @OneToMany(() => TemplateVersion, (version) => version.template)
  versions!: TemplateVersion[];
}
