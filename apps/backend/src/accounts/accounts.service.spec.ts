import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AccountsService } from './accounts.service';
import { AccountConfig } from './entities/account-config.entity';
import { AccountLinkedAccount } from './entities/account-linked-account.entity';
import { Account } from './entities/account.entity';
import { User } from '../users/entities/user.entity';

type MockRepository<T extends object> = Pick<Repository<T>, 'findOne'>;

function createRepository<T extends object>(): jest.Mocked<MockRepository<T>> {
  return {
    findOne: jest.fn(),
  };
}

describe('AccountsService', () => {
  let service: AccountsService;
  let accounts: jest.Mocked<MockRepository<Account>>;
  let accountConfigs: jest.Mocked<MockRepository<AccountConfig>>;
  let linkedAccounts: jest.Mocked<MockRepository<AccountLinkedAccount>>;
  let users: jest.Mocked<MockRepository<User>>;

  beforeEach(async () => {
    accounts = createRepository<Account>();
    accountConfigs = createRepository<AccountConfig>();
    linkedAccounts = createRepository<AccountLinkedAccount>();
    users = createRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: accounts,
        },
        {
          provide: getRepositoryToken(AccountConfig),
          useValue: accountConfigs,
        },
        {
          provide: getRepositoryToken(AccountLinkedAccount),
          useValue: linkedAccounts,
        },
        {
          provide: getRepositoryToken(User),
          useValue: users,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('looks up active accounts by account id', async () => {
    accounts.findOne.mockResolvedValue(null);

    await service.findActiveAccount('account-1');

    expect(accounts.findOne).toHaveBeenCalledWith({
      where: {
        id: 'account-1',
        archivedAt: IsNull(),
      },
    });
  });

  it('returns account-scoped config values', async () => {
    accountConfigs.findOne.mockResolvedValue({
      value: { locale: 'en' },
    } as AccountConfig);

    await expect(
      service.findConfigValue('account-1', 'settings'),
    ).resolves.toEqual({ locale: 'en' });
    expect(accountConfigs.findOne).toHaveBeenCalledWith({
      where: {
        accountId: 'account-1',
        key: 'settings',
      },
    });
  });

  it('looks up linked accounts within the current account', async () => {
    linkedAccounts.findOne.mockResolvedValue(null);

    await service.findLinkedAccount({
      accountId: 'account-1',
      accountType: 'testing',
    });

    expect(linkedAccounts.findOne).toHaveBeenCalledWith({
      where: {
        accountId: 'account-1',
        accountType: 'testing',
      },
    });
  });
});
