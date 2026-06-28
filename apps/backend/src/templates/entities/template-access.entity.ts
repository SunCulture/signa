import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Template } from './template.entity';

@Entity('template_accesses')
@Index(['templateId', 'userId'], { unique: true })
export class TemplateAccess {
  static readonly ADMIN_USER_ID = '-1';

  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ name: 'template_id', type: 'bigint' })
  templateId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Template, (template) => template.accesses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: Template;

  @ManyToOne(() => User, {
    createForeignKeyConstraints: false,
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;
}
