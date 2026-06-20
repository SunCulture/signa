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
import { User } from '../../users/entities/user.entity';
import { AccountConfig } from './account-config.entity';
import { AccountLinkedAccount } from './account-linked-account.entity';
import { EncryptedConfig } from './encrypted-config.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    default: () => '(gen_random_uuid())',
  })
  uuid!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone!: string;

  @Column({ type: 'varchar', length: 16, default: 'en-US' })
  locale!: string;

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

  @OneToMany(() => User, (user) => user.account)
  users!: User[];

  @OneToMany(() => AccountConfig, (config) => config.account)
  configs!: AccountConfig[];

  @OneToMany(() => EncryptedConfig, (config) => config.account)
  encryptedConfigs!: EncryptedConfig[];

  @OneToMany(() => AccountLinkedAccount, (link) => link.account)
  linkedAccounts!: AccountLinkedAccount[];
}
