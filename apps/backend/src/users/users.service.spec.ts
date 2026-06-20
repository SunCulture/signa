import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

type MockRepository<T extends object> = Pick<Repository<T>, 'findOne'>;

function createRepository<T extends object>(): jest.Mocked<MockRepository<T>> {
  return {
    findOne: jest.fn(),
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
});
