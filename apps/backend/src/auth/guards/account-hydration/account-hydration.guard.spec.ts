import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Account } from '../../../accounts/entities/account.entity';
import { AccountsService } from '../../../accounts/accounts.service';
import type { AuthenticatedRequest } from '../../authenticated-request';
import { AccountHydrationGuard } from './account-hydration.guard';

describe('AccountHydrationGuard', () => {
  let accountsService: jest.Mocked<Pick<AccountsService, 'findActiveAccount'>>;
  let guard: AccountHydrationGuard;

  beforeEach(() => {
    accountsService = {
      findActiveAccount: jest.fn(),
    };
    guard = new AccountHydrationGuard(
      accountsService as unknown as AccountsService,
    );
  });

  it('hydrates the active account from the web session', async () => {
    const account = { id: 'account-1' } as Account;
    const request = {
      session: {
        accountId: 'account-1',
        userId: 'user-1',
        role: 'admin',
      },
    } as AuthenticatedRequest;
    accountsService.findActiveAccount.mockResolvedValue(account);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(accountsService.findActiveAccount).toHaveBeenCalledWith('account-1');
    expect(request.account).toBe(account);
  });

  it('hydrates the active account from API token tenancy context', async () => {
    const account = { id: 'account-1' } as Account;
    const request = {
      tenant: {
        accountId: 'account-1',
        userId: 'user-1',
        accessTokenId: 'token-1',
      },
    } as AuthenticatedRequest;
    accountsService.findActiveAccount.mockResolvedValue(account);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(request.account).toBe(account);
  });

  it('rejects missing auth context', async () => {
    await expect(
      guard.canActivate(createContext({} as AuthenticatedRequest)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive accounts', async () => {
    accountsService.findActiveAccount.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({
          session: {
            accountId: 'account-1',
            userId: 'user-1',
            role: 'admin',
          },
        } as AuthenticatedRequest),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function createContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
