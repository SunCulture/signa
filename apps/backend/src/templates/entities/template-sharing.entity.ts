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
import { Account } from '../../accounts/entities/account.entity';
import { Template } from './template.entity';

@Entity('template_sharings')
@Index(['accountId', 'templateId'], { unique: true })
export class TemplateSharing {
  static readonly ALL_ID = '-1';

  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  ability!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'account_id' })
  account!: Account | null;

  @ManyToOne(() => Template, (template) => template.sharings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: Template;
}
