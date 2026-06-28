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

@Entity('encrypted_configs')
@Index(['accountId', 'key'], { unique: true })
export class EncryptedConfig {
  @PrimaryGeneratedColumn()
  id!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, (account) => account.encryptedConfigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account!: Account;
}
