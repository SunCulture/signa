import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageBlob } from '../storage/entities/storage-blob.entity';
import { StorageService } from '../storage/storage.service';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Template } from '../templates/entities/template.entity';
import { User } from '../users/entities/user.entity';
import { Submitter } from './entities/submitter.entity';
import { SubmittersService } from './submitters.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

type TransactionCallback = (manager: EntityManager) => Promise<unknown>;

function createRepository<T extends object>(): MockRepository<T> {
  return {
    create: jest.fn((input: Partial<T>) => input),
    createQueryBuilder: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
  };
}

describe('SubmittersService', () => {
  let service: SubmittersService;
  let submitters: MockRepository<Submitter>;
  let submissions: MockRepository<Submission>;
  let submissionEvents: MockRepository<SubmissionEvent>;
  let storage: jest.Mocked<
    Pick<StorageService, 'findRecordAttachments' | 'createBlobProxyUrl'>
  >;
  let dataSource: {
    transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };

  beforeEach(async () => {
    submitters = createRepository<Submitter>();
    submissions = createRepository<Submission>();
    submissionEvents = createRepository<SubmissionEvent>();
    storage = {
      findRecordAttachments: jest.fn().mockResolvedValue([]),
      createBlobProxyUrl: jest.fn((blob: StorageBlob) => `/files/${blob.id}`),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Submitter) {
          return submitters;
        }

        if (entity === Submission) {
          return submissions;
        }

        if (entity === SubmissionEvent) {
          return submissionEvents;
        }

        throw new Error('Unexpected repository');
      }),
    } as unknown as EntityManager;

    dataSource = {
      transaction: jest.fn((callback: TransactionCallback) =>
        callback(manager),
      ),
    };

    submitters.save?.mockImplementation((entity: Submitter) =>
      Promise.resolve(entity),
    );
    submissions.save?.mockImplementation((entity: Submission) =>
      Promise.resolve(entity),
    );
    submissionEvents.save?.mockImplementation(
      (entity: Partial<SubmissionEvent>) =>
        Promise.resolve(createSubmissionEvent(entity)),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmittersService,
        {
          provide: getRepositoryToken(Submitter),
          useValue: submitters,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: StorageService,
          useValue: storage,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, fallback: unknown) => fallback),
          },
        },
      ],
    }).compile();

    service = module.get<SubmittersService>(SubmittersService);
  });

  it('lists tenant-scoped submitters with DocuSeal-style pagination', async () => {
    const submitter = createSubmitter({
      submission: createSubmission(),
      submissionEvents: [createSubmissionEvent({ eventType: 'view_form' })],
      values: { field_name: 'John Doe' },
    });
    const builder = createQueryBuilder([submitter]);
    submitters.createQueryBuilder?.mockReturnValue(builder);

    const result = await service.listSubmitters(createUser(), {
      q: 'john',
      limit: 150,
      include: 'fields',
    });

    expect(builder.where).toHaveBeenCalledWith(
      'submitter.account_id = :accountId',
      { accountId: 'account-1' },
    );
    expect(builder.limit).toHaveBeenCalledWith(100);
    expect(result.pagination).toEqual({
      count: 1,
      next: 'submitter-1',
      prev: 'submitter-1',
    });
    expect(result.data[0]).toMatchObject({
      id: 'submitter-1',
      role: 'First Party',
      status: 'sent',
      values: [{ field: 'Full Name', value: 'John Doe' }],
      template: {
        id: 'template-1',
        name: 'NDA',
      },
      submission_events: [
        {
          event_type: 'view_form',
          data: {},
        },
      ],
      fields: [
        expect.objectContaining({
          uuid: 'field_name',
        }),
      ],
    });
  });

  it('updates values and completes a submitter through an API completion event', async () => {
    const submission = createSubmission();
    const submitter = createSubmitter({ submission });
    submitters.findOneOrFail?.mockResolvedValue(submitter);
    storage.findRecordAttachments.mockResolvedValue([
      createAttachment({
        uuid: 'attachment-uuid',
        blob: { id: 'blob-1', filename: 'contract.pdf' } as StorageBlob,
      }),
    ]);

    const response = await service.updateSubmitter(
      createUser(),
      'submitter-1',
      {
        email: 'ADA@example.com',
        phone: '(555) 111-2222',
        name: 'Ada Lovelace',
        external_id: 'external-1',
        values: {
          field_name: 'Ada Lovelace',
        },
        readonly_fields: ['Full Name'],
        fields: [
          {
            name: 'Full Name',
            required: true,
            default_value: 'Ada Lovelace',
          },
        ],
        completed: true,
      },
    );

    expect(submitter.email).toBe('ada@example.com');
    expect(submitter.phone).toBe('5551112222');
    expect(submitter.completedAt).toBeInstanceOf(Date);
    expect(submitter.values).toEqual({ field_name: 'Ada Lovelace' });
    expect(submitter.externalId).toBe('external-1');
    expect(submission.templateFields).toEqual([
      expect.objectContaining({
        uuid: 'field_name',
        readonly: true,
        required: true,
        default_value: 'Ada Lovelace',
      }),
    ]);
    expect(submitters.save).toHaveBeenCalledWith(submitter);
    expect(submissions.save).toHaveBeenCalledWith(submission);
    expect(submissionEvents.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        submissionId: 'submission-1',
        submitterId: 'submitter-1',
        eventType: 'api_complete_form',
      }),
    );
    expect(response).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      status: 'completed',
      role: 'First Party',
      embed_src: 'http://localhost:3001/s/submitter-slug',
      documents: [{ name: 'contract', url: '/files/blob-1' }],
    });
  });

  it('rejects updates after completion or decline like DocuSeal', async () => {
    submitters.findOneOrFail?.mockResolvedValueOnce(
      createSubmitter({
        completedAt: new Date('2026-06-19T00:00:00.000Z'),
        submission: createSubmission(),
      }),
    );

    await expect(
      service.updateSubmitter(createUser(), 'submitter-1', { name: 'Ada' }),
    ).rejects.toThrow(UnprocessableEntityException);

    submitters.findOneOrFail?.mockResolvedValueOnce(
      createSubmitter({
        declinedAt: new Date('2026-06-19T00:00:00.000Z'),
        submission: createSubmission(),
      }),
    );

    await expect(
      service.updateSubmitter(createUser(), 'submitter-1', { name: 'Ada' }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

function createUser(): User {
  return {
    id: 'user-1',
    accountId: 'account-1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
  } as User;
}

function createTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: 'template-1',
    accountId: 'account-1',
    authorId: 'user-1',
    folderId: 'folder-1',
    externalId: 'external-template-1',
    fields: [
      {
        uuid: 'field_name',
        name: 'Full Name',
        type: 'text',
        submitter_uuid: 'submitter-role-1',
      },
    ],
    name: 'NDA',
    preferences: {},
    schema: [{ attachment_uuid: 'attachment-uuid', name: 'contract' }],
    sharedLink: false,
    slug: 'template-slug',
    source: 'api',
    submitters: [{ name: 'First Party', uuid: 'submitter-role-1' }],
    variablesSchema: null,
    archivedAt: null,
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    ...overrides,
  } as Template;
}

function createSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 'submission-1',
    accountId: 'account-1',
    createdByUserId: 'user-1',
    templateId: 'template-1',
    name: null,
    slug: 'submission-slug',
    source: 'api',
    submittersOrder: 'preserved',
    preferences: {},
    templateFields: null,
    templateSchema: null,
    templateSubmitters: null,
    variables: {},
    variablesSchema: null,
    expireAt: null,
    archivedAt: null,
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    template: createTemplate(),
    createdByUser: createUser(),
    submitters: [],
    submissionEvents: [],
    ...overrides,
  } as Submission;
}

function createSubmitter(overrides: Partial<Submitter> = {}): Submitter {
  return {
    id: 'submitter-1',
    accountId: 'account-1',
    submissionId: 'submission-1',
    uuid: 'submitter-role-1',
    slug: 'submitter-slug',
    email: 'john@example.com',
    name: 'John Doe',
    phone: null,
    externalId: null,
    metadata: {},
    preferences: {},
    values: {},
    sentAt: new Date('2026-06-19T00:00:00.000Z'),
    openedAt: null,
    completedAt: null,
    declinedAt: null,
    timezone: null,
    ip: null,
    ua: null,
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    submission: createSubmission(),
    submissionEvents: [],
    ...overrides,
  } as Submitter;
}

function createSubmissionEvent(
  overrides: Partial<SubmissionEvent> = {},
): SubmissionEvent {
  return {
    id: 'event-1',
    accountId: 'account-1',
    submissionId: 'submission-1',
    submitterId: 'submitter-1',
    eventType: 'api_complete_form',
    eventTimestamp: new Date('2026-06-19T00:00:00.000Z'),
    data: {},
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    ...overrides,
  } as SubmissionEvent;
}

function createAttachment(
  overrides: Partial<StorageAttachment> = {},
): StorageAttachment {
  return {
    id: 'attachment-1',
    uuid: 'attachment-uuid',
    name: 'documents',
    recordType: 'Template',
    recordId: 'template-1',
    blobId: 'blob-1',
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    blob: {
      id: 'blob-1',
      filename: 'contract.pdf',
    } as StorageBlob,
    ...overrides,
  };
}

function createQueryBuilder(result: Submitter[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}
