import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../users/entities/user.entity';
import { AccountConfig } from './account-config.entity';
import { AccountLinkedAccount } from './account-linked-account.entity';
import { EncryptedConfig } from './encrypted-config.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
  })
  uuid: string = uuidv4();

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;

  @Column({ type: 'varchar', length: 16, default: 'en-US' })
  locale!: string;

  @DeleteDateColumn({ name: 'archived_at', type: Date, nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => User, (user) => user.account)
  users!: User[];

  @OneToMany(() => AccountConfig, (config) => config.account)
  configs!: AccountConfig[];

  @OneToMany(() => EncryptedConfig, (config) => config.account)
  encryptedConfigs!: EncryptedConfig[];

  @OneToMany(() => AccountLinkedAccount, (link) => link.account)
  linkedAccounts!: AccountLinkedAccount[];
}
