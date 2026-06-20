import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountsService } from '../../../accounts/accounts.service';
import { AuthenticatedRequest } from '../../authenticated-request';

@Injectable()
export class AccountHydrationGuard implements CanActivate {
  constructor(private readonly accountsService: AccountsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accountId = request.session?.accountId ?? request.tenant?.accountId;

    if (!accountId) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    const account = await this.accountsService.findActiveAccount(accountId);

    if (!account) {
      throw new UnauthorizedException({ error: 'Not authenticated' });
    }

    request.account = account;
    return true;
  }
}
