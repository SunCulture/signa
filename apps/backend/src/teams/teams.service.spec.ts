import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { TeamInvitation } from './entities/team-invitation.entity';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';

type MockRepository<T extends object> = {
  create: jest.Mock<T, [Partial<T>]>;
  existsBy: jest.Mock<Promise<boolean>, [Record<string, unknown>]>;
  find: jest.Mock<Promise<T[]>, [Record<string, unknown>]>;
  save: jest.Mock<Promise<T>, [Partial<T>]>;
};

function createRepository<T extends object>(): jest.Mocked<MockRepository<T>> {
  return {
    create: jest.fn((input) => input as T),
    existsBy: jest.fn((where: Record<string, unknown>) => {
      void where;
      return Promise.resolve(false);
    }),
    find: jest.fn(),
    save: jest.fn((input) => Promise.resolve(input as T)),
  };
}

describe('TeamsService', () => {
  let service: TeamsService;
  let teamMembers: jest.Mocked<MockRepository<TeamMember>>;
  let teams: jest.Mocked<MockRepository<Team>>;

  beforeEach(async () => {
    teams = createRepository<Team>();
    teamMembers = createRepository<TeamMember>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getRepositoryToken(Team), useValue: teams },
        { provide: getRepositoryToken(TeamMember), useValue: teamMembers },
        { provide: getRepositoryToken(TeamInvitation), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('creates a default team with the registering user as manager', async () => {
    teams.save.mockResolvedValue({
      id: 'team-1',
      name: 'Acme',
      slug: 'acme',
    } as Team);

    await service.createDefaultTeam({
      accountId: 'account-1',
      name: 'Acme',
      userId: 'user-1',
    });

    expect(teams.create).toHaveBeenCalledWith({
      accountId: 'account-1',
      createdByUserId: 'user-1',
      name: 'Acme',
      slug: 'acme',
    });
    expect(teamMembers.create).toHaveBeenCalledWith({
      accountId: 'account-1',
      role: 'manager',
      teamId: 'team-1',
      userId: 'user-1',
    });
  });

  it('lists active account teams by default', async () => {
    teams.find.mockResolvedValue([]);

    await service.listTeams({ accountId: 'account-1' });

    expect(teams.find).toHaveBeenCalledWith({
      where: { accountId: 'account-1', archivedAt: IsNull() },
      relations: { members: true },
      order: { id: 'DESC' },
    });
  });
});
