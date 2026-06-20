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
import { User } from '../../users/entities/user.entity';
import type { TeamRole } from '../team-roles';
import { Team } from './team.entity';

@Entity('team_members')
@Index(['teamId', 'userId'], { unique: true })
@Index(['accountId', 'userId'])
@Index(['teamId', 'role'])
export class TeamMember {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'account_id', type: 'bigint' })
  accountId!: string;

  @Column({ name: 'team_id', type: 'bigint' })
  teamId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'varchar', length: 32, default: 'member' })
  role!: TeamRole;

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

  @ManyToOne(() => Team, (team) => team.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
