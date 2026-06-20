import type { Request } from 'express';
import type { Account } from '../accounts/entities/account.entity';
import type { User } from '../users/entities/user.entity';
import type { TenantContext } from './tenant-context';
import type { WebSession } from './web-session';

export type AuthenticatedRequest = Request & {
  account?: Account;
  tenant?: TenantContext;
  session?: WebSession;
  user?: User;
};
