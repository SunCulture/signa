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
import { Account } from './account.entity';

@Entity('account_linked_accounts')
@Index(['accountId', 'linkedAccountId'], { unique: true })
export class AccountLinkedAccount {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ name: 'linked_account_id', type: 'bigint' })
  linkedAccountId!: string;

  @Column({ name: 'account_type', type: 'text', default: 'testing' })
  accountType!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, (account) => account.linkedAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'linked_account_id' })
  linkedAccount!: Account;
}
