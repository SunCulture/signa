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
import { Template } from './template.entity';

@Entity('template_folders')
export class TemplateFolder {
  static readonly DEFAULT_NAME = 'Default';

  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index()
  @Column({ name: 'author_id', type: 'bigint' })
  authorId!: string;

  @Index()
  @Column({ name: 'parent_folder_id', type: 'bigint', nullable: true })
  parentFolderId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @DeleteDateColumn({ name: 'archived_at', type: Date, nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @ManyToOne(() => TemplateFolder, (folder) => folder.subfolders, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_folder_id' })
  parentFolder!: TemplateFolder | null;

  @OneToMany(() => TemplateFolder, (folder) => folder.parentFolder)
  subfolders!: TemplateFolder[];

  @OneToMany(() => Template, (template) => template.folder)
  templates!: Template[];
}
