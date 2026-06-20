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
import { TeamInvitation } from './team-invitation.entity';
import { TeamMember } from './team-member.entity';

@Entity('teams')
@Index(['accountId', 'slug'], { unique: true })
@Index(['accountId', 'archivedAt'])
export class Team {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    default: () => '(gen_random_uuid())',
  })
  uuid!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'created_by_user_id', type: 'bigint' })
  createdByUserId!: string;

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

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @OneToMany(() => TeamMember, (member) => member.team)
  members!: TeamMember[];

  @OneToMany(() => TeamInvitation, (invitation) => invitation.team)
  invitations!: TeamInvitation[];
}
