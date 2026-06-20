import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    default: () => '(gen_random_uuid())',
  })
  uuid!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255, nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 255, nullable: true })
  lastName!: string | null;

  @Column({ type: 'varchar', length: 64, default: 'admin' })
  role!: string;

  @Column({
    name: 'encrypted_password',
    type: 'varchar',
    length: 255,
  })
  encryptedPassword!: string;

  @Column({ name: 'confirmation_sent_at', type: 'timestamptz', nullable: true })
  confirmationSentAt!: Date | null;

  @Column({ name: 'confirmation_token', type: 'varchar', nullable: true })
  confirmationToken!: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'consumed_timestep', type: 'integer', nullable: true })
  consumedTimestep!: number | null;

  @Column({ name: 'current_sign_in_at', type: 'timestamptz', nullable: true })
  currentSignInAt!: Date | null;

  @Column({ name: 'current_sign_in_ip', type: 'varchar', nullable: true })
  currentSignInIp!: string | null;

  @Column({ name: 'failed_attempts', type: 'integer', default: 0 })
  failedAttempts!: number;

  @Column({ name: 'last_sign_in_at', type: 'timestamptz', nullable: true })
  lastSignInAt!: Date | null;

  @Column({ name: 'last_sign_in_ip', type: 'varchar', nullable: true })
  lastSignInIp!: string | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'otp_required_for_login', type: 'boolean', default: false })
  otpRequiredForLogin!: boolean;

  @Column({ name: 'otp_secret', type: 'varchar', nullable: true })
  otpSecret!: string | null;

  @Column({ name: 'remember_created_at', type: 'timestamptz', nullable: true })
  rememberCreatedAt!: Date | null;

  @Index({ unique: true })
  @Column({ name: 'reset_password_token', type: 'varchar', nullable: true })
  resetPasswordToken!: string | null;

  @Column({
    name: 'reset_password_sent_at',
    type: 'timestamptz',
    nullable: true,
  })
  resetPasswordSentAt!: Date | null;

  @Column({ name: 'sign_in_count', type: 'integer', default: 0 })
  signInCount!: number;

  @Column({ name: 'unconfirmed_email', type: 'varchar', nullable: true })
  unconfirmedEmail!: string | null;

  @Index({ unique: true })
  @Column({ name: 'unlock_token', type: 'varchar', nullable: true })
  unlockToken!: string | null;

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

  @ManyToOne(() => Account, (account) => account.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account!: Account;
}
