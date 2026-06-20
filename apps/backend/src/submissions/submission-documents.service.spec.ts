import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageBlob } from '../storage/entities/storage-blob.entity';
import { StorageService } from '../storage/storage.service';
import { Submitter } from '../submitters/entities/submitter.entity';
import { Template } from '../templates/entities/template.entity';
import { CompletedDocument } from './entities/completed-document.entity';
import { CompletedSubmitter } from './entities/completed-submitter.entity';
import { DocumentGenerationEvent } from './entities/document-generation-event.entity';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import { SubmissionDocumentsService } from './submission-documents.service';
import { SubmissionPdfGeneratorService } from './submission-pdf-generator.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

function createRepository<T extends object>(): MockRepository<T> {
  return {
    create: jest.fn((input: Partial<T>) => input),
    exists: jest.fn().mockResolvedValue(false),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn((input: Partial<T>) => Promise.resolve(input)),
  };
}

describe('SubmissionDocumentsService', () => {
  let service: SubmissionDocumentsService;
  let completedDocuments: MockRepository<CompletedDocument>;
  let completedSubmitters: MockRepository<CompletedSubmitter>;
  let generationEvents: MockRepository<DocumentGenerationEvent>;
  let storage: jest.Mocked<
    Pick<
      StorageService,
      | 'createBlobProxyUrl'
      | 'createPdfAttachment'
      | 'deleteRecordAttachments'
      | 'findRecordAttachments'
      | 'readBlob'
    >
  >;
  let sourcePdf: Buffer;
  let storedBuffers: Buffer[];
  let createdPdfInputs: Array<
    Parameters<StorageService['createPdfAttachment']>[0]
  >;
  let savedCompletedDocuments: Partial<CompletedDocument>[];

  beforeEach(async () => {
    sourcePdf = await buildPdfBuffer();
    storedBuffers = [];
    createdPdfInputs = [];
    savedCompletedDocuments = [];
    completedDocuments = createRepository<CompletedDocument>();
    completedSubmitters = createRepository<CompletedSubmitter>();
    generationEvents = createRepository<DocumentGenerationEvent>();
    storage = {
      createBlobProxyUrl: jest.fn((blob: StorageBlob) => `/files/${blob.id}`),
      createPdfAttachment: jest.fn((input) => {
        createdPdfInputs.push(input);
        storedBuffers.push(input.buffer);

        return Promise.resolve(
          createAttachment({
            id: `generated-${storedBuffers.length}`,
            name: input.name,
            recordType: input.recordType,
            recordId: input.recordId,
            blob: {
              id: `generated-blob-${storedBuffers.length}`,
              filename: input.filename,
              contentType: 'application/pdf',
              metadata: {
                ...(input.metadata ?? {}),
                sha256: `sha-${storedBuffers.length}`,
              },
            } as unknown as StorageBlob,
          }),
        );
      }),
      deleteRecordAttachments: jest.fn().mockResolvedValue(undefined),
      findRecordAttachments: jest.fn((query) => {
        if (query.recordType === 'Template') {
          return Promise.resolve([createAttachment()]);
        }

        return Promise.resolve([]);
      }),
      readBlob: jest.fn((blob: StorageBlob) => {
        void blob;
        return Promise.resolve(sourcePdf);
      }),
    };
    completedDocuments.save?.mockImplementation(
      (input: Partial<CompletedDocument>) => {
        savedCompletedDocuments.push(input);

        return Promise.resolve(input as CompletedDocument);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionDocumentsService,
        SubmissionPdfGeneratorService,
        {
          provide: getRepositoryToken(CompletedDocument),
          useValue: completedDocuments,
        },
        {
          provide: getRepositoryToken(CompletedSubmitter),
          useValue: completedSubmitters,
        },
        {
          provide: getRepositoryToken(DocumentGenerationEvent),
          useValue: generationEvents,
        },
        {
          provide: StorageService,
          useValue: storage,
        },
      ],
    }).compile();

    service = module.get<SubmissionDocumentsService>(
      SubmissionDocumentsService,
    );
  });

  it('generates pending preview PDFs with value-hash metadata', async () => {
    const submission = createSubmission({
      submitters: [createSubmitter({ values: { field_name: 'Ada' } })],
    });

    const documents = await service.getSubmissionDocuments(submission);

    expect(documents).toHaveLength(1);
    expect(storage.createPdfAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'preview_documents',
        recordType: 'Submission',
        recordId: 'submission-1',
      }),
    );
    const generatedBuffer = storedBuffers.at(0);
    const previewInput = createdPdfInputs.at(0);

    expect(typeof previewInput?.metadata?.values_hash).toBe('string');
    expect(generatedBuffer).toBeDefined();
    await expect(
      PDFDocument.load(generatedBuffer ?? Buffer.alloc(0)),
    ).resolves.toBeDefined();
  });

  it('generates completed submitter result documents and checksum records', async () => {
    const submitter = createSubmitter({
      completedAt: new Date('2026-06-20T00:00:00.000Z'),
      values: { field_name: 'Ada' },
    });
    const submission = createSubmission({ submitters: [submitter] });
    submitter.submission = submission;

    await service.processSubmitterCompletion(submitter);

    expect(completedSubmitters.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        submitterId: 'submitter-1',
        submissionId: 'submission-1',
      }),
    );
    expect(storage.createPdfAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'documents',
        recordType: 'Submitter',
        recordId: 'submitter-1',
      }),
    );
    const completedDocumentInput = savedCompletedDocuments.at(0);

    expect(completedDocumentInput).toMatchObject({
      submitterId: 'submitter-1',
    });
    expect(typeof completedDocumentInput?.sha256).toBe('string');
  });

  it('generates merged completed documents when merge is requested', async () => {
    const submitter = createSubmitter({
      completedAt: new Date('2026-06-20T00:00:00.000Z'),
    });
    const submission = createSubmission({ submitters: [submitter] });
    submitter.submission = submission;

    const documents = await service.getSubmissionDocuments(submission, {
      merge: true,
    });

    expect(documents).toHaveLength(1);
    expect(storage.createPdfAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'merged_document',
        recordType: 'Submission',
        recordId: 'submission-1',
      }),
    );
  });

  it('generates audit trails for completed submissions', async () => {
    const submitter = createSubmitter({
      completedAt: new Date('2026-06-20T00:00:00.000Z'),
    });
    const submission = createSubmission({
      submitters: [submitter],
      submissionEvents: [
        createSubmissionEvent({ eventType: 'view_form' }),
        createSubmissionEvent({ eventType: 'complete_form' }),
      ],
    });
    submitter.submission = submission;

    const url = await service.getAuditTrailUrl(submission);

    expect(url).toBe('/files/generated-blob-1');
    expect(storage.createPdfAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'audit_trail',
        recordType: 'Submission',
        recordId: 'submission-1',
      }),
    );
  });
});

async function buildPdfBuffer(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([612, 792]);

  return Buffer.from(await pdf.save());
}

function createSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: 'submission-1',
    accountId: 'account-1',
    templateId: 'template-1',
    name: 'NDA',
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
    submitters: [],
    submissionEvents: [],
    ...overrides,
  } as Submission;
}

function createTemplate(): Template {
  return {
    id: 'template-1',
    name: 'NDA',
    fields: [
      {
        uuid: 'field_name',
        name: 'Full Name',
        type: 'text',
        submitter_uuid: 'submitter-role-1',
        areas: [
          {
            attachment_uuid: 'attachment-uuid',
            page: 0,
            x: 0.1,
            y: 0.1,
            w: 0.4,
            h: 0.04,
          },
        ],
      },
    ],
    schema: [{ attachment_uuid: 'attachment-uuid', name: 'contract' }],
    submitters: [{ name: 'First Party', uuid: 'submitter-role-1' }],
  } as Template;
}

function createSubmitter(overrides: Partial<Submitter> = {}): Submitter {
  return {
    id: 'submitter-1',
    accountId: 'account-1',
    submissionId: 'submission-1',
    uuid: 'submitter-role-1',
    slug: 'submitter-slug',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    values: {},
    metadata: {},
    preferences: {},
    completedAt: null,
    declinedAt: null,
    sentAt: null,
    openedAt: null,
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
    eventType: 'complete_form',
    eventTimestamp: new Date('2026-06-20T00:00:00.000Z'),
    data: {},
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
    blob: {
      id: 'blob-1',
      filename: 'contract.pdf',
      contentType: 'application/pdf',
      metadata: {},
    } as StorageBlob,
    ...overrides,
  } as StorageAttachment;
}
