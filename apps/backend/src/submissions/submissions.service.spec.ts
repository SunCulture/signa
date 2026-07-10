import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageBlob } from '../storage/entities/storage-blob.entity';
import { StorageService } from '../storage/storage.service';
import { runtimeEvents } from '../runtime/runtime-events';
import { Submitter } from '../submitters/entities/submitter.entity';
import { TemplateFolder } from '../templates/entities/template-folder.entity';
import { Template } from '../templates/entities/template.entity';
import { TemplatesService } from '../templates/templates.service';
import { User } from '../users/entities/user.entity';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import { DocumentGenerationQueueService } from './document-generation-queue.service';
import { SubmissionDocumentsService } from './submission-documents.service';
import { SubmitterValueNormalizer } from './submitter-value-normalizer.service';
import { SubmissionsService } from './submissions.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

type TransactionCallback = (manager: EntityManager) => Promise<unknown>;

function createRepository<T extends object>(): MockRepository<T> {
  return {
    create: jest.fn((input: Partial<T>) => input),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    remove: jest.fn(),
    save: jest.fn(),
  };
}

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let submissions: MockRepository<Submission>;
  let submitters: MockRepository<Submitter>;
  let templates: MockRepository<Template>;
  let submissionEvents: MockRepository<SubmissionEvent>;
  let storage: jest.Mocked<
    Pick<
      StorageService,
      'createBlobProxyUrl' | 'findPreviewAttachments' | 'findRecordAttachments'
    >
  >;
  let submissionDocuments: jest.Mocked<
    Pick<
      SubmissionDocumentsService,
      | 'getAuditTrailUrl'
      | 'getCombinedDocumentUrl'
      | 'getSubmissionDocuments'
      | 'processSubmitterCompletion'
    >
  >;
  let dataSource: {
    transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
  };
  let events: { emit: jest.Mock };

  beforeEach(async () => {
    submissions = createRepository<Submission>();
    submitters = createRepository<Submitter>();
    templates = createRepository<Template>();
    submissionEvents = createRepository<SubmissionEvent>();
    storage = {
      findRecordAttachments: jest.fn().mockResolvedValue([]),
      findPreviewAttachments: jest.fn().mockResolvedValue([]),
      createBlobProxyUrl: jest.fn((blob: StorageBlob) => `/files/${blob.id}`),
    };
    submissionDocuments = {
      getAuditTrailUrl: jest.fn().mockResolvedValue(null),
      getCombinedDocumentUrl: jest.fn().mockResolvedValue(null),
      getSubmissionDocuments: jest.fn().mockResolvedValue([]),
      processSubmitterCompletion: jest.fn().mockResolvedValue(undefined),
    };

    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === Submission) {
          return submissions;
        }

        if (entity === Submitter) {
          return submitters;
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
    events = {
      emit: jest.fn(),
    };

    submissions.save?.mockImplementation((entity: Partial<Submission>) =>
      Promise.resolve(
        createSubmission({
          ...entity,
          id: entity.id ?? 'submission-1',
          slug: entity.slug ?? 'submission-slug',
        }),
      ),
    );
    submitters.save?.mockImplementation((entity: Partial<Submitter>) =>
      Promise.resolve(
        createSubmitter({
          ...entity,
          id: entity.id ?? `submitter-${submitters.save?.mock.calls.length}`,
          submissionId: entity.submissionId ?? 'submission-1',
        }),
      ),
    );
    submissionEvents.save?.mockImplementation(
      (entity: Partial<SubmissionEvent>) =>
        Promise.resolve(
          createSubmissionEvent({
            ...entity,
            id: entity.id ?? 'event-1',
          }),
        ),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: getRepositoryToken(Submission),
          useValue: submissions,
        },
        {
          provide: getRepositoryToken(Submitter),
          useValue: submitters,
        },
        {
          provide: getRepositoryToken(Template),
          useValue: templates,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: TemplatesService,
          useValue: {
            createBackingTemplateFromPdf: jest.fn(),
          },
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
        {
          provide: SubmissionDocumentsService,
          useValue: submissionDocuments,
        },
        {
          provide: DocumentGenerationQueueService,
          useValue: {
            enqueueSubmissionArtifacts: jest.fn(),
            enqueueSubmitterCompletion: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: events,
        },
        SubmitterValueNormalizer,
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
  });

  it('creates a submission from a template and returns DocuSeal-style submitters', async () => {
    templates.findOne?.mockResolvedValue(createTemplate());

    const response = await service.createSubmission(createUser(), {
      template_id: 'template-1',
      submitters: [
        {
          role: 'First Party',
          email: 'JOHN@example.com',
          name: 'John Doe',
          values: {
            field_name: 'John Doe',
          },
        },
      ],
    });

    expect(response).toMatchObject([
      {
        submission_id: 'submission-1',
        uuid: 'submitter-role-1',
        email: 'john@example.com',
        name: 'John Doe',
        status: 'awaiting',
        role: 'First Party',
        values: [{ field: 'Full Name', value: 'John Doe' }],
      },
    ]);
    expect(response[0]?.embed_src).toContain('http://localhost:3001/s/');
    expect(events.emit).toHaveBeenCalledWith(
      runtimeEvents.submitterInvitationRequested,
      {
        accountId: 'account-1',
        submitterId: 'submitter-1',
      },
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(submissions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        templateId: 'template-1',
        source: 'api',
        submittersOrder: 'preserved',
      }),
    );
    expect(submitters.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        uuid: 'submitter-role-1',
        email: 'john@example.com',
      }),
    );
  });

  it('merges multiple roles into one submitter like DocuSeal', async () => {
    templates.findOne?.mockResolvedValue(
      createTemplate({
        submitters: [
          { name: 'Seller', uuid: 'seller-role' },
          { name: 'Buyer', uuid: 'buyer-role', linked_to_uuid: 'seller-role' },
          { name: 'Witness', uuid: 'witness-role' },
        ],
        fields: [
          {
            uuid: 'seller_name',
            name: 'Full Name',
            type: 'text',
            submitter_uuid: 'seller-role',
            areas: [{ page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.03 }],
          },
          {
            uuid: 'buyer_name',
            name: 'Full Name',
            type: 'text',
            submitter_uuid: 'buyer-role',
            areas: [{ page: 1, x: 0.2, y: 0.2, w: 0.2, h: 0.03 }],
          },
          {
            uuid: 'witness_name',
            name: 'Witness Name',
            type: 'text',
            submitter_uuid: 'witness-role',
          },
        ],
      }),
    );

    const response = await service.createSubmission(createUser(), {
      template_id: 'template-1',
      submitters: [
        {
          roles: ['Seller', 'Buyer'],
          role: 'Counterparties',
          email: 'counterparties@example.com',
          name: 'Counter Parties',
        },
      ],
    });
    const saveMock = submissions.save as jest.Mock<
      Promise<Submission>,
      [Partial<Submission>]
    >;
    const savedSubmission = saveMock.mock.calls[0]?.[0] as Submission;
    const mergedSubmitter = savedSubmission.templateSubmitters?.[0];
    const mergedField = savedSubmission.templateFields?.find(
      (field) => field.name === 'Full Name',
    );
    const witnessField = savedSubmission.templateFields?.find(
      (field) => field.name === 'Witness Name',
    );

    expect(response).toMatchObject([
      {
        email: 'counterparties@example.com',
        role: 'Counterparties',
      },
    ]);
    expect(mergedSubmitter).toMatchObject({
      name: 'Counterparties',
    });
    expect(typeof mergedSubmitter?.uuid).toBe('string');
    expect(mergedSubmitter?.uuid).not.toBe('seller-role');
    expect(mergedSubmitter?.uuid).not.toBe('buyer-role');
    expect(mergedSubmitter?.linked_to_uuid).toBeUndefined();
    expect(mergedField).toMatchObject({
      submitter_uuid: mergedSubmitter?.uuid,
      areas: [
        expect.objectContaining({ page: 0 }),
        expect.objectContaining({ page: 1 }),
      ],
    });
    expect(witnessField).toMatchObject({
      submitter_uuid: 'witness-role',
    });
    expect(submitters.save).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: mergedSubmitter?.uuid,
      }),
    );
  });

  it('rejects archived templates like DocuSeal', async () => {
    templates.findOne?.mockResolvedValue(
      createTemplate({ archivedAt: new Date('2026-06-19T00:00:00.000Z') }),
    );

    await expect(
      service.createSubmission(createUser(), {
        template_id: 'template-1',
        submitters: [{ email: 'john@example.com' }],
      }),
    ).rejects.toMatchObject({
      response: { error: 'Template has been archived' },
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('serializes generated documents for a submission', async () => {
    const submission = createSubmission({
      templateId: 'template-1',
      template: createTemplate(),
      submitters: [createSubmitter()],
    });
    submissions.findOneOrFail?.mockResolvedValue(submission);
    submissionDocuments.getSubmissionDocuments.mockResolvedValue([
      createAttachment({
        uuid: 'attachment-uuid',
        blob: { id: 'blob-1', filename: 'contract.pdf' } as StorageBlob,
      }),
    ]);
    storage.findPreviewAttachments.mockResolvedValue([
      createAttachment({
        id: 'preview-1',
        uuid: 'preview-uuid',
        blob: {
          id: 'preview-blob-1',
          filename: '0.png',
          metadata: { width: 1400, height: 1800 },
        } as unknown as StorageBlob,
      }),
    ]);

    await expect(
      service.getSubmissionDocuments(createUser(), 'submission-1'),
    ).resolves.toEqual({
      id: 'submission-1',
      documents: [
        {
          id: 'attachment-1',
          uuid: 'attachment-uuid',
          filename: 'contract.pdf',
          name: 'contract',
          url: '/files/blob-1',
          preview_images: [
            {
              id: 'preview-1',
              filename: '0.png',
              metadata: { width: 1400, height: 1800 },
              url: '/files/preview-blob-1',
            },
          ],
        },
      ],
    });
    expect(submissionDocuments.getSubmissionDocuments).toHaveBeenCalledWith(
      submission,
      {},
    );
  });

  it('archives submissions by default', async () => {
    const submission = createSubmission();
    submissions.findOneOrFail?.mockResolvedValue(submission);
    submissions.save?.mockImplementation((entity: Submission) =>
      Promise.resolve(entity),
    );

    const result = await service.deleteSubmission(
      createUser(),
      'submission-1',
      {},
    );

    expect(result.id).toBe('submission-1');
    expect(result.archived_at).toBeInstanceOf(Date);
    expect(submissions.remove).not.toHaveBeenCalled();
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
    externalId: 'external-1',
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
    folder: {
      id: 'folder-1',
      name: 'Default',
      parentFolder: null,
    } as TemplateFolder,
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
    blob: {
      id: 'blob-1',
      filename: 'contract.pdf',
    } as StorageBlob,
    ...overrides,
  } as StorageAttachment;
}
