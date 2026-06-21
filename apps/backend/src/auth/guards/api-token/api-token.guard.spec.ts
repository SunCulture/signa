import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedRequest } from '../../authenticated-request';
import { AuthService } from '../../auth.service';
import { ApiTokenGuard } from './api-token.guard';

function createContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('ApiTokenGuard', () => {
  let authService: jest.Mocked<Pick<AuthService, 'resolveApiToken'>>;

  beforeEach(() => {
    authService = {
      resolveApiToken: jest.fn(),
    };
  });

  it('rejects requests without an API token', async () => {
    const guard = new ApiTokenGuard(authService as unknown as AuthService);
    const request = { headers: {} } as AuthenticatedRequest;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid API tokens', async () => {
    authService.resolveApiToken.mockResolvedValue(null);

    const guard = new ApiTokenGuard(authService as unknown as AuthService);
    const request = {
      headers: {
        'x-auth-token': 'bad-token',
      },
    } as unknown as AuthenticatedRequest;

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches tenant context for valid API tokens', async () => {
    authService.resolveApiToken.mockResolvedValue({
      accountId: 'account-1',
      userId: 'user-1',
      accessTokenId: 'token-1',
      role: 'admin',
      apiTokenPermissions: ['templates:read'],
    });

    const guard = new ApiTokenGuard(authService as unknown as AuthService);
    const request = {
      headers: {
        'x-auth-token': 'api-token',
      },
    } as unknown as AuthenticatedRequest;

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(authService.resolveApiToken).toHaveBeenCalledWith('api-token');
    expect(request.tenant).toEqual({
      accountId: 'account-1',
      userId: 'user-1',
      accessTokenId: 'token-1',
      role: 'admin',
      apiTokenPermissions: ['templates:read'],
    });
  });
});
