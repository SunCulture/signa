import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

type MockRepository<T extends object> = {
  create: jest.Mock<T, [Partial<T>]>;
  findOne: jest.Mock;
  merge: jest.Mock<T, [T, Partial<T>]>;
  save: jest.Mock<Promise<T>, [T]>;
};

function createRepository<T extends object>(): jest.Mocked<MockRepository<T>> {
  return {
    create: jest.fn((input: Partial<T>) => input as T),
    findOne: jest.fn(),
    merge: jest.fn((target: T, input: Partial<T>) =>
      Object.assign(target, input),
    ),
    save: jest.fn((input: T) => Promise.resolve(input)),
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let users: jest.Mocked<MockRepository<User>>;

  beforeEach(async () => {
    users = createRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: users,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('loads an active user with account relation', async () => {
    users.findOne.mockResolvedValue(null);

    await service.findActiveUser('user-1');

    expect(users.findOne).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        archivedAt: IsNull(),
      },
      relations: {
        account: true,
      },
    });
  });

  it('normalizes email before account-scoped lookup', async () => {
    users.findOne.mockResolvedValue(null);

    await service.findByEmailInAccount({
      accountId: 'account-1',
      email: 'OWNER@EXAMPLE.COM',
    });

    expect(users.findOne).toHaveBeenCalledWith({
      where: {
        accountId: 'account-1',
        email: 'owner@example.com',
        archivedAt: IsNull(),
      },
    });
  });

  it('creates users with supported Signa roles', async () => {
    users.findOne.mockResolvedValue(null);

    const response = await service.createUser('account-1', {
      email: 'editor@example.com',
      first_name: 'Ed',
      last_name: 'Itor',
      role: 'editor',
    });

    expect(response.role).toBe('editor');
    expect(users.merge).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ role: 'editor' }),
    );
  });

  it('imports users with only email and reports skipped duplicates', async () => {
    users.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: '2',
        accountId: 'account-1',
        email: 'taken@example.com',
        archivedAt: null,
      });

    const response = await service.importUsers('account-1', {
      users: [
        {
          email: 'new@example.com',
        },
        {
          email: 'taken@example.com',
        },
      ],
    });

    expect(response.created).toBe(1);
    expect(response.skipped).toBe(1);
    expect(response.results[0]).toMatchObject({
      email: 'new@example.com',
      status: 'created',
    });
    expect(response.results[1]).toMatchObject({
      email: 'taken@example.com',
      status: 'skipped',
    });
  });
});
