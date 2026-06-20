import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { AccessToken } from './entities/access-token.entity';

type MockRepository<T extends object> = Pick<Repository<T>, 'findOne'>;

function createRepository<T extends object>(): jest.Mocked<MockRepository<T>> {
  return {
    findOne: jest.fn(),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let accessTokens: jest.Mocked<MockRepository<AccessToken>>;
  let dataSource: jest.Mocked<
    Pick<DataSource, 'getRepository' | 'transaction'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    accessTokens = createRepository<AccessToken>();
    dataSource = {
      getRepository: jest.fn(),
      transaction: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(AccessToken),
          useValue: accessTokens,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('hashes API tokens with SHA-256', () => {
    expect(service.hashApiToken('api-token')).toHaveLength(64);
    expect(service.hashApiToken('api-token')).toBe(
      service.hashApiToken('api-token'),
    );
  });

  it('returns tenant context for a valid token', async () => {
    accessTokens.findOne.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      user: {
        accountId: 'account-1',
        archivedAt: null,
        account: {
          archivedAt: null,
        },
      },
    } as AccessToken);

    await expect(service.resolveApiToken('api-token')).resolves.toEqual({
      accountId: 'account-1',
      userId: 'user-1',
      accessTokenId: 'token-1',
    });
  });

  it('returns null when the token has no active user', async () => {
    accessTokens.findOne.mockResolvedValue({
      user: {
        archivedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    } as AccessToken);

    await expect(service.resolveApiToken('api-token')).resolves.toBeNull();
  });

  it('returns null when the token user account is archived', async () => {
    accessTokens.findOne.mockResolvedValue({
      user: {
        archivedAt: null,
        account: {
          archivedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      },
    } as AccessToken);

    await expect(service.resolveApiToken('api-token')).resolves.toBeNull();
  });
});
