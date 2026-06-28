jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageBlob } from '../storage/entities/storage-blob.entity';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/entities/user.entity';
import { DocumentConversionService } from './document-conversion.service';
import { DocxFieldTagService } from './docx-field-tag.service';
import { DynamicDocumentVersion } from './entities/dynamic-document-version.entity';
import { DynamicDocument } from './entities/dynamic-document.entity';
import { TemplateEvent } from './entities/template-event.entity';
import { TemplateFolder } from './entities/template-folder.entity';
import { Template } from './entities/template.entity';
import { TemplateVersion } from './entities/template-version.entity';
import { PdfAcroFormService } from './pdf-acro-form/pdf-acro-form.service';
import { TemplatesService } from './templates.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

function createRepository<T extends object>(): MockRepository<T> {
  return {
    create: jest.fn((input: Partial<T>) => input),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
}

function createTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: '10',
    accountId: 'account-1',
    authorId: 'user-1',
    folderId: 'folder-1',
    externalId: 'external-1',
    fields: [],
    name: 'NDA',
    preferences: {},
    schema: [],
    sharedLink: false,
    slug: 'template-slug',
    source: 'native',
    submitters: [{ name: 'First Party', uuid: 'submitter-1' }],
    variablesSchema: null,
    archivedAt: null,
    createdAt: new Date('2026-06-19T00:00:00.000Z'),
    updatedAt: new Date('2026-06-19T00:00:00.000Z'),
    author: {
      id: 'user-1',
      email: 'owner@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    } as User,
    folder: {
      id: 'folder-1',
      name: 'Default',
      parentFolder: null,
    } as TemplateFolder,
    ...overrides,
  } as Template;
}

describe('TemplatesService', () => {
  let service: TemplatesService;
  let templates: MockRepository<Template>;
  let folders: MockRepository<TemplateFolder>;
  let templateEvents: MockRepository<TemplateEvent>;
  let templateVersions: MockRepository<TemplateVersion>;
  let dynamicDocuments: MockRepository<DynamicDocument>;
  let dynamicDocumentVersions: MockRepository<DynamicDocumentVersion>;
  let storage: jest.Mocked<
    Pick<
      StorageService,
      | 'createPdfAttachment'
      | 'cloneAttachment'
      | 'createBlobProxyUrl'
      | 'deleteRecordAttachments'
      | 'findPreviewAttachment'
      | 'findPreviewAttachments'
      | 'findRecordAttachments'
    >
  >;
  let pdfAcroForm: jest.Mocked<Pick<PdfAcroFormService, 'extractFields'>>;
  let documentConversion: jest.Mocked<
    Pick<
      DocumentConversionService,
      'convertDocxToPdf' | 'hashSource' | 'renderHtmlDocument'
    >
  >;
  let docxFieldTags: jest.Mocked<
    Pick<DocxFieldTagService, 'extractMarkerFields' | 'prepareDocument'>
  >;

  beforeEach(async () => {
    templates = createRepository<Template>();
    folders = createRepository<TemplateFolder>();
    templateEvents = createRepository<TemplateEvent>();
    templateVersions = createRepository<TemplateVersion>();
    dynamicDocuments = createRepository<DynamicDocument>();
    dynamicDocumentVersions = createRepository<DynamicDocumentVersion>();
    storage = {
      cloneAttachment: jest.fn(),
      createPdfAttachment: jest.fn(),
      createBlobProxyUrl: jest.fn((blob: StorageBlob) => `/files/${blob.id}`),
      deleteRecordAttachments: jest.fn(),
      findPreviewAttachment: jest.fn(),
      findPreviewAttachments: jest.fn().mockResolvedValue([]),
      findRecordAttachments: jest.fn().mockResolvedValue([]),
    };
    pdfAcroForm = {
      extractFields: jest.fn().mockResolvedValue([]),
    };
    documentConversion = {
      convertDocxToPdf: jest.fn(),
      hashSource: jest.fn().mockReturnValue('docx-sha1'),
      renderHtmlDocument: jest.fn(),
    };
    docxFieldTags = {
      extractMarkerFields: jest.fn().mockResolvedValue([]),
      prepareDocument: jest.fn((buffer: Buffer) => ({
        buffer,
        markers: [],
      })),
    };
    folders.find?.mockResolvedValue([createTemplate().folder]);
    templateEvents.create?.mockImplementation(
      (input: Partial<TemplateEvent>) => input as TemplateEvent,
    );
    templateEvents.save?.mockImplementation((input: TemplateEvent) =>
      Promise.resolve({ id: 'template-event-1', ...input }),
    );
    templateVersions.create?.mockImplementation(
      (input: Partial<TemplateVersion>) => input as TemplateVersion,
    );
    templateVersions.findOne?.mockResolvedValue(null);
    templateVersions.save?.mockImplementation((input: TemplateVersion) =>
      Promise.resolve(input),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(Template),
          useValue: templates,
        },
        {
          provide: getRepositoryToken(TemplateFolder),
          useValue: folders,
        },
        {
          provide: getRepositoryToken(TemplateEvent),
          useValue: templateEvents,
        },
        {
          provide: getRepositoryToken(TemplateVersion),
          useValue: templateVersions,
        },
        {
          provide: getRepositoryToken(DynamicDocument),
          useValue: dynamicDocuments,
        },
        {
          provide: getRepositoryToken(DynamicDocumentVersion),
          useValue: dynamicDocumentVersions,
        },
        {
          provide: StorageService,
          useValue: storage,
        },
        {
          provide: PdfAcroFormService,
          useValue: pdfAcroForm,
        },
        {
          provide: DocumentConversionService,
          useValue: documentConversion,
        },
        {
          provide: DocxFieldTagService,
          useValue: docxFieldTags,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  it('serializes listed templates with DocuSeal pagination shape', async () => {
    const builder = createQueryBuilder([createTemplate()]);
    templates.createQueryBuilder?.mockReturnValue(builder);

    await expect(
      service.listTemplates(createUser(), { limit: 10 }),
    ).resolves.toMatchObject({
      data: [
        {
          id: '10',
          name: 'NDA',
          application_key: 'external-1',
          folder_name: 'Default',
          author: {
            email: 'owner@example.com',
          },
          documents: [],
        },
      ],
      pagination: {
        count: 1,
        next: '10',
        prev: '10',
      },
    });

    expect(builder.where).toHaveBeenCalledWith(
      'template.account_id = :accountId',
      { accountId: 'account-1' },
    );
  });

  it('filters archived templates when archived view is requested', async () => {
    const builder = createQueryBuilder([
      createTemplate({ archivedAt: new Date('2026-06-19T09:00:00.000Z') }),
    ]);
    templates.createQueryBuilder?.mockReturnValue(builder);

    await expect(
      service.listTemplates(createUser(), { archived: true, limit: 10 }),
    ).resolves.toMatchObject({
      data: [
        {
          id: '10',
          archived_at: new Date('2026-06-19T09:00:00.000Z'),
        },
      ],
    });

    expect(builder.andWhere).toHaveBeenCalledWith(
      'template.archivedAt IS NOT NULL',
    );
    expect(builder.withDeleted).toHaveBeenCalled();
  });

  it('creates a blank builder template', async () => {
    const folder = { id: 'folder-1', name: 'Default' } as TemplateFolder;
    folders.findOne?.mockResolvedValue(folder);
    templates.create?.mockImplementation((input: Partial<Template>) =>
      createTemplate({
        ...input,
        id: undefined as never,
        author: createTemplate().author,
        folder,
      }),
    );
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(
        createTemplate({
          ...entity,
          id: entity.id ?? '10',
          author: createTemplate().author,
          folder,
          createdAt: entity.createdAt ?? new Date('2026-06-19T00:00:00.000Z'),
          updatedAt: new Date('2026-06-19T01:00:00.000Z'),
        }),
      ),
    );
    templates.findOneOrFail?.mockResolvedValue(
      createTemplate({
        fields: [],
        folder,
        name: 'Blank NDA',
        schema: [],
      }),
    );

    await expect(
      service.createTemplate(createUser(), { name: 'Blank NDA' }),
    ).resolves.toMatchObject({
      documents: [],
      fields: [],
      name: 'Blank NDA',
      schema: [],
      submitters: [expect.objectContaining({ name: 'First Party' })],
    });

    expect(templates.save).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: [],
        name: 'Blank NDA',
        schema: [],
        source: 'native',
      }),
    );
    expect(templateEvents.save).toHaveBeenCalled();
    expect(templateVersions.save).toHaveBeenCalled();
  });

  it('updates role names like DocuSeal roles param', async () => {
    const template = createTemplate();
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve({
        ...entity,
        updatedAt: new Date('2026-06-19T01:00:00.000Z'),
      }),
    );

    await service.updateTemplate(createUser(), '10', {
      roles: ['Signer', 'Approver'],
    });

    expect(templates.save).toHaveBeenCalledWith(
      expect.objectContaining({
        submitters: [
          expect.objectContaining({ name: 'Signer' }),
          expect.objectContaining({ name: 'Approver' }),
        ],
      }),
    );
  });

  it('updates schema document names like DocuSeal builder controls', async () => {
    const template = createTemplate({
      schema: [{ attachment_uuid: 'document-1', name: 'Original' }],
    });
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(entity),
    );

    await service.updateTemplate(createUser(), '10', {
      schema: [{ attachment_uuid: 'document-1', name: 'Renamed' }],
    });

    expect(templates.save).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: [{ attachment_uuid: 'document-1', name: 'Renamed' }],
      }),
    );
  });

  it('restores archived templates with soft-deleted lookup enabled', async () => {
    const template = createTemplate({
      archivedAt: new Date('2026-06-19T09:00:00.000Z'),
    });
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(entity),
    );

    await service.updateTemplate(createUser(), '10', { archived: false });

    expect(template.archivedAt).toBeNull();
    expect(templates.findOneOrFail).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
  });

  it('soft archives templates by default', async () => {
    const template = createTemplate();
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(entity),
    );

    const result = await service.deleteTemplate(createUser(), '10', {});

    expect(result.id).toBe('10');
    expect(result.archived_at).toBeInstanceOf(Date);

    expect(templates.remove).not.toHaveBeenCalled();
  });

  it('permanently removes templates when requested', async () => {
    const template = createTemplate();
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.remove?.mockResolvedValue(template);

    await expect(
      service.deleteTemplate(createUser(), '10', { permanently: true }),
    ).resolves.toEqual({
      id: '10',
      archived_at: null,
    });

    expect(templates.remove).toHaveBeenCalledWith(template);
    expect(templates.findOneOrFail).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
  });

  it('creates a template from DocuSeal JSON PDF documents', async () => {
    const folder = { id: 'folder-1', name: 'Default' } as TemplateFolder;
    const documentAttachment = createAttachment();
    folders.findOne?.mockResolvedValue(folder);
    templates.findOne?.mockResolvedValue(null);
    templates.create?.mockImplementation((input: Partial<Template>) =>
      createTemplate({
        ...input,
        id: undefined as never,
        author: createTemplate().author,
        folder,
      }),
    );
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(
        createTemplate({
          ...entity,
          id: entity.id ?? '10',
          author: createTemplate().author,
          folder,
          createdAt: entity.createdAt ?? new Date('2026-06-19T00:00:00.000Z'),
          updatedAt: new Date('2026-06-19T01:00:00.000Z'),
        }),
      ),
    );
    templates.findOneOrFail?.mockResolvedValue(
      createTemplate({
        schema: [{ attachment_uuid: 'attachment-uuid', name: 'document' }],
        folder,
      }),
    );
    storage.createPdfAttachment.mockResolvedValue(documentAttachment);
    storage.findRecordAttachments.mockResolvedValue([documentAttachment]);

    await expect(
      service.createTemplateFromPdf(createUser(), {
        name: 'Test PDF',
        documents: [
          {
            name: 'document.pdf',
            file: Buffer.from('%PDF-1.7').toString('base64'),
            fields: [
              {
                name: 'Name',
                type: 'text',
                role: 'Signer',
                areas: [{ x: 0, y: 0, w: 10, h: 10, page: 1 }],
              },
            ],
          },
        ],
      }),
    ).resolves.toMatchObject({
      name: 'NDA',
      documents: [
        {
          id: 'attachment-1',
          uuid: 'attachment-uuid',
          url: '/files/blob-1',
          filename: 'document.pdf',
        },
      ],
    });

    expect(storage.createPdfAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'document.pdf',
        name: 'documents',
        recordType: 'Template',
        recordId: '10',
      }),
    );
    expect(templates.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fields: [
          expect.objectContaining({
            name: 'Name',
            areas: [expect.objectContaining({ page: 0 })],
          }),
        ],
        schema: [{ attachment_uuid: 'attachment-uuid', name: 'document' }],
      }),
    );
    expect(pdfAcroForm.extractFields).not.toHaveBeenCalled();
  });

  it('uses extracted AcroForm fields when PDF documents do not provide fields', async () => {
    const folder = { id: 'folder-1', name: 'Default' } as TemplateFolder;
    const documentAttachment = createAttachment();
    folders.findOne?.mockResolvedValue(folder);
    templates.findOne?.mockResolvedValue(null);
    templates.create?.mockImplementation((input: Partial<Template>) =>
      createTemplate({
        ...input,
        id: undefined as never,
        author: createTemplate().author,
        folder,
      }),
    );
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(
        createTemplate({
          ...entity,
          id: entity.id ?? '10',
          author: createTemplate().author,
          folder,
          updatedAt: new Date('2026-06-19T01:00:00.000Z'),
        }),
      ),
    );
    templates.findOneOrFail?.mockResolvedValue(createTemplate({ folder }));
    storage.createPdfAttachment.mockResolvedValue(documentAttachment);
    pdfAcroForm.extractFields.mockResolvedValue([
      {
        uuid: 'field-1',
        name: 'Legal Name',
        type: 'text',
        areas: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.04, page: 0 }],
      },
    ]);

    await service.createTemplateFromPdf(createUser(), {
      name: 'Test PDF',
      documents: [
        {
          name: 'document.pdf',
          file: Buffer.from('%PDF-1.7').toString('base64'),
        },
      ],
    });

    expect(pdfAcroForm.extractFields).toHaveBeenCalledWith(
      expect.any(Buffer),
      '',
    );
    const saveMock = templates.save as jest.Mock<Promise<Template>, [Template]>;
    const savedTemplate = saveMock.mock.calls.at(-1)?.[0];

    expect(savedTemplate).toBeDefined();

    if (!savedTemplate) {
      return;
    }

    const [savedField] = savedTemplate.fields;

    expect(savedField).toMatchObject({
      name: 'Legal Name',
      areas: [
        expect.objectContaining({
          page: 0,
          attachment_uuid: 'attachment-uuid',
        }),
      ],
    });
    expect(savedTemplate.schema).toEqual([
      expect.objectContaining({ pending_fields: true }),
    ]);
    expect(typeof savedField?.submitter_uuid).toBe('string');
  });

  it('adds a generated blank page as a template document', async () => {
    const template = createTemplate({
      fields: [],
      schema: [],
    });
    const blankAttachment = createAttachment({
      filename: 'Blank Page.pdf',
      uuid: 'blank-attachment-uuid',
    });
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(createTemplate({ ...entity })),
    );
    storage.createPdfAttachment.mockResolvedValue(blankAttachment);
    storage.findRecordAttachments.mockResolvedValue([blankAttachment]);

    await expect(
      service.updateTemplateDocuments(createUser(), '10', {
        documents: [
          {
            name: 'Blank Page',
            size: 'letter',
            type: 'blank',
          },
        ],
        merge: true,
      }),
    ).resolves.toMatchObject({
      documents: [
        {
          filename: 'Blank Page.pdf',
          uuid: 'blank-attachment-uuid',
        },
      ],
      schema: [
        { attachment_uuid: 'blank-attachment-uuid', name: 'Blank Page' },
      ],
    });

    expect(storage.createPdfAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'Blank Page.pdf',
        name: 'documents',
        recordId: '10',
        recordType: 'Template',
      }),
    );
    expect(
      storage.createPdfAttachment.mock.calls[0]?.[0].buffer
        .subarray(0, 4)
        .toString(),
    ).toBe('%PDF');
  });

  it('creates a dynamic template from DocuSeal HTML field tags', async () => {
    const folder = { id: 'folder-1', name: 'Default' } as TemplateFolder;
    const documentAttachment = createAttachment();
    folders.findOne?.mockResolvedValue(folder);
    templates.findOne?.mockResolvedValue(null);
    dynamicDocuments.create?.mockImplementation(
      (input: Partial<DynamicDocument>) => input,
    );
    dynamicDocuments.save?.mockResolvedValue({
      id: 'dynamic-document-1',
      sha1: 'dynamic-sha1',
    });
    dynamicDocumentVersions.create?.mockImplementation(
      (input: Partial<DynamicDocumentVersion>) => input,
    );
    dynamicDocumentVersions.save?.mockResolvedValue({
      id: 'dynamic-version-1',
    });
    templates.create?.mockImplementation((input: Partial<Template>) =>
      createTemplate({
        ...input,
        id: undefined as never,
        author: createTemplate().author,
        folder,
      }),
    );
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(
        createTemplate({
          ...entity,
          id: entity.id ?? '10',
          author: createTemplate().author,
          folder,
          updatedAt: new Date('2026-06-19T01:00:00.000Z'),
        }),
      ),
    );
    templates.findOneOrFail?.mockResolvedValue(
      createTemplate({
        folder,
        schema: [
          { attachment_uuid: 'attachment-uuid', dynamic: true, name: 'html' },
        ],
      }),
    );
    storage.createPdfAttachment.mockResolvedValue(documentAttachment);
    storage.findRecordAttachments.mockResolvedValue([documentAttachment]);
    documentConversion.renderHtmlDocument.mockResolvedValue({
      body: '<p><text-field name="Name"></text-field></p>',
      buffer: Buffer.from('%PDF-1.7'),
      fields: [
        {
          name: 'Name',
          type: 'text',
          role: 'Signer',
          areas: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.04, page: 0 }],
        },
      ],
      filename: 'html.pdf',
      head: null,
    });

    await service.createTemplateFromHtml(createUser(), {
      html: '<p><text-field name="Name"></text-field></p>',
      name: 'HTML Template',
    });

    expect(documentConversion.renderHtmlDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        html: '<p><text-field name="Name"></text-field></p>',
        name: 'HTML Template',
      }),
    );
    expect(dynamicDocuments.save).toHaveBeenCalledWith(
      expect.objectContaining({
        body: '<p><text-field name="Name"></text-field></p>',
        templateId: '10',
        uuid: 'attachment-uuid',
      }),
    );
    expect(dynamicDocumentVersions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        areas: [expect.objectContaining({ x: 0.1 })],
        dynamicDocumentId: 'dynamic-document-1',
        sha1: 'dynamic-sha1',
      }),
    );
    expect(templates.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schema: [
          {
            attachment_uuid: 'attachment-uuid',
            dynamic: true,
            name: 'html',
          },
        ],
      }),
    );
  });

  it('creates a DOCX template with extracted field tags and explicit fields', async () => {
    const folder = { id: 'folder-1', name: 'Default' } as TemplateFolder;
    const documentAttachment = createAttachment();
    const docxBuffer = Buffer.from('PK fake-docx');
    folders.findOne?.mockResolvedValue(folder);
    templates.findOne?.mockResolvedValue(null);
    dynamicDocuments.create?.mockImplementation(
      (input: Partial<DynamicDocument>) => input,
    );
    dynamicDocuments.save?.mockResolvedValue({
      id: 'dynamic-document-1',
      sha1: 'dynamic-sha1',
    });
    dynamicDocumentVersions.create?.mockImplementation(
      (input: Partial<DynamicDocumentVersion>) => input,
    );
    dynamicDocumentVersions.save?.mockResolvedValue({
      id: 'dynamic-version-1',
    });
    templates.create?.mockImplementation((input: Partial<Template>) =>
      createTemplate({
        ...input,
        id: undefined as never,
        author: createTemplate().author,
        folder,
      }),
    );
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(
        createTemplate({
          ...entity,
          id: entity.id ?? '10',
          author: createTemplate().author,
          folder,
          updatedAt: new Date('2026-06-19T01:00:00.000Z'),
        }),
      ),
    );
    templates.findOneOrFail?.mockResolvedValue(
      createTemplate({
        folder,
        schema: [
          { attachment_uuid: 'attachment-uuid', dynamic: true, name: 'docx' },
        ],
      }),
    );
    storage.createPdfAttachment.mockResolvedValue(documentAttachment);
    storage.findRecordAttachments.mockResolvedValue([documentAttachment]);
    docxFieldTags.prepareDocument.mockReturnValue({
      buffer: Buffer.from('prepared-docx'),
      markers: [
        {
          marker: 'SIGNATAG0001',
          field: { name: 'Signature', role: 'Signer', type: 'signature' },
        },
      ],
    });
    docxFieldTags.extractMarkerFields.mockResolvedValue([
      {
        areas: [{ h: 0.04, page: 0, w: 0.16, x: 0.2, y: 0.3 }],
        name: 'Signature',
        role: 'Signer',
        type: 'signature',
      },
    ]);
    documentConversion.convertDocxToPdf.mockResolvedValue(
      Buffer.from('%PDF-1.7'),
    );

    await service.createTemplateFromDocx(createUser(), {
      documents: [
        {
          fields: [
            {
              areas: [{ h: 0.04, page: 1, w: 0.2, x: 0.1, y: 0.1 }],
              name: 'Name',
              role: 'Signer',
              type: 'text',
            },
          ],
          file: docxBuffer.toString('base64'),
          name: 'contract.docx',
        },
      ],
      name: 'DOCX Template',
    });

    expect(documentConversion.convertDocxToPdf).toHaveBeenCalledWith({
      buffer: Buffer.from('prepared-docx'),
      name: 'contract.docx',
    });
    const saveMock = templates.save as jest.Mock<Promise<Template>, [Template]>;
    const savedTemplate = saveMock.mock.calls.at(-1)?.[0];

    expect(savedTemplate?.fields).toEqual([
      expect.objectContaining({ name: 'Signature', type: 'signature' }),
      expect.objectContaining({ name: 'Name', type: 'text' }),
    ]);
  });

  it('adds a DOCX document to an existing template from the editor flow', async () => {
    const documentAttachment = createAttachment({
      filename: 'contract.pdf',
      uuid: 'docx-attachment-uuid',
    });
    const template = createTemplate({
      fields: [],
      schema: [],
      submitters: [{ name: 'Signer', uuid: 'submitter-1' }],
    });
    const docxBuffer = Buffer.from('PK fake-docx');
    templates.findOneOrFail?.mockResolvedValue(template);
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(entity),
    );
    dynamicDocuments.create?.mockImplementation(
      (input: Partial<DynamicDocument>) => input,
    );
    dynamicDocuments.save?.mockResolvedValue({
      id: 'dynamic-document-1',
      sha1: 'dynamic-sha1',
    });
    dynamicDocumentVersions.create?.mockImplementation(
      (input: Partial<DynamicDocumentVersion>) => input,
    );
    dynamicDocumentVersions.save?.mockResolvedValue({
      id: 'dynamic-version-1',
    });
    storage.createPdfAttachment.mockResolvedValue(documentAttachment);
    storage.findRecordAttachments.mockResolvedValue([documentAttachment]);
    docxFieldTags.prepareDocument.mockReturnValue({
      buffer: Buffer.from('prepared-docx'),
      markers: [
        {
          marker: 'SIGNATAG0001',
          field: { name: 'Signature', role: 'Signer', type: 'signature' },
        },
      ],
    });
    docxFieldTags.extractMarkerFields.mockResolvedValue([
      {
        areas: [{ h: 0.04, page: 0, w: 0.16, x: 0.2, y: 0.3 }],
        name: 'Signature',
        role: 'Signer',
        type: 'signature',
      },
    ]);
    documentConversion.convertDocxToPdf.mockResolvedValue(
      Buffer.from('%PDF-1.7'),
    );

    const response = await service.updateTemplateDocuments(
      createUser(),
      template.id,
      {
        documents: [
          {
            file: docxBuffer.toString('base64'),
            name: 'contract.docx',
          },
        ],
        merge: true,
      },
    );

    expect(documentConversion.convertDocxToPdf).toHaveBeenCalledWith({
      buffer: Buffer.from('prepared-docx'),
      name: 'contract.docx',
    });
    const createdAttachmentInput =
      storage.createPdfAttachment.mock.calls.at(-1)?.[0];

    expect(createdAttachmentInput?.buffer).toEqual(Buffer.from('%PDF-1.7'));
    expect(createdAttachmentInput?.filename).toBe('contract.pdf');
    expect(createdAttachmentInput?.metadata).toMatchObject({
      dynamic: true,
      dynamic_source_type: 'docx',
    });
    expect(response.schema).toEqual([
      {
        attachment_uuid: 'docx-attachment-uuid',
        dynamic: true,
        name: 'contract',
      },
    ]);
  });

  it('clones templates with DocuSeal-style UUID remapping and cloned attachments', async () => {
    const originalAttachment = createAttachment({
      id: 'original-attachment',
      uuid: 'document-uuid',
      blobId: 'blob-1',
    });
    const originalPreview = createAttachment({
      id: 'original-preview',
      uuid: 'preview-uuid',
      blobId: 'preview-blob',
      filename: '0.png',
    });
    const clonedPreview = createAttachment({
      id: 'cloned-preview',
      uuid: 'cloned-preview-uuid',
      blobId: 'preview-blob',
      filename: '0.png',
    });
    const template = createTemplate({
      fields: [
        {
          uuid: 'field-1',
          submitter_uuid: 'submitter-1',
          type: 'number',
          conditions: [{ field_uuid: 'field-2', action: 'not_empty' }],
          preferences: { formula: '{{field-2}} * 2' },
          areas: [
            {
              attachment_uuid: 'document-uuid',
              h: 0.1,
              page: 0,
              w: 0.2,
              x: 0.3,
              y: 0.4,
            },
          ],
        },
        {
          uuid: 'field-2',
          submitter_uuid: 'submitter-1',
          type: 'text',
          areas: [],
        },
      ],
      preferences: {
        submitters: [{ uuid: 'submitter-1', request_email_subject: 'Hi' }],
      },
      schema: [{ attachment_uuid: 'document-uuid', name: 'NDA' }],
      submitters: [
        {
          name: 'First Party',
          uuid: 'submitter-1',
          invite_via_field_uuid: 'field-2',
        },
      ],
    });

    let savedCloneEntity: Template | null = null;
    templates.findOneOrFail
      ?.mockResolvedValueOnce(template)
      .mockImplementationOnce(() =>
        Promise.resolve(savedCloneEntity as Template),
      );
    templates.create?.mockImplementation((input: Partial<Template>) =>
      createTemplate({
        ...input,
        id: undefined as never,
        author: createTemplate().author,
        folder: template.folder,
      }),
    );
    templates.save?.mockImplementation((entity: Template) =>
      Promise.resolve(
        (savedCloneEntity = createTemplate({
          ...entity,
          id: 'cloned-template',
          author: createTemplate().author,
          folder: template.folder,
        })),
      ),
    );
    let clonedAttachment: StorageAttachment | null = null;
    storage.findRecordAttachments.mockImplementation(({ recordId }) =>
      Promise.resolve(
        recordId === '10'
          ? [originalAttachment]
          : clonedAttachment
            ? [clonedAttachment]
            : [],
      ),
    );
    storage.findPreviewAttachments.mockImplementation((attachmentId) =>
      Promise.resolve(
        attachmentId === 'original-attachment'
          ? [originalPreview]
          : [clonedPreview],
      ),
    );
    storage.cloneAttachment.mockImplementation((input) => {
      if (input.recordType === 'Template') {
        clonedAttachment = createAttachment({
          id: 'cloned-attachment',
          uuid: input.uuid,
          blobId: input.sourceAttachment.blobId,
        });

        return Promise.resolve(clonedAttachment);
      }

      return Promise.resolve(clonedPreview);
    });

    const response = await service.cloneTemplate(createUser(), '10', {
      external_id: 'cloned-external',
      name: 'Cloned Template Name',
    });
    const savedClone = savedCloneEntity as Template | null;

    expect(savedClone).toBeDefined();

    if (!savedClone) {
      return;
    }

    type ClonedField = {
      areas?: Array<{ attachment_uuid?: string }>;
      conditions?: Array<{ field_uuid?: string }>;
      preferences?: { formula?: string };
      submitter_uuid?: string;
      uuid?: string;
    };
    type ClonedSubmitter = {
      invite_via_field_uuid?: string;
      uuid?: string;
    };
    const savedFields: ClonedField[] = savedClone.fields;
    const savedSubmitters: ClonedSubmitter[] = savedClone.submitters;
    const savedSchema: Array<{ attachment_uuid?: string }> = savedClone.schema;
    const [clonedField, conditionField] = savedFields;
    const [clonedSubmitter] = savedSubmitters;
    const clonedDocumentUuid = savedSchema[0]?.attachment_uuid;

    expect(savedClone).toMatchObject({
      externalId: 'cloned-external',
      name: 'Cloned Template Name',
      source: 'api',
    });
    expect(clonedSubmitter?.uuid).not.toBe('submitter-1');
    expect(clonedField?.uuid).not.toBe('field-1');
    expect(conditionField?.uuid).not.toBe('field-2');
    expect(clonedDocumentUuid).not.toBe('document-uuid');
    expect(clonedField?.submitter_uuid).toBe(clonedSubmitter?.uuid);
    expect(clonedField?.areas?.[0]?.attachment_uuid).toBe(clonedDocumentUuid);
    const clonedPreferences = savedClone.preferences as {
      submitters?: Array<{ uuid?: string }>;
    };

    expect(clonedField?.conditions?.[0]?.field_uuid).toBe(conditionField?.uuid);
    expect(clonedField?.preferences?.formula).toContain(
      String(conditionField?.uuid),
    );
    expect(clonedPreferences.submitters).toEqual([
      expect.objectContaining({ uuid: clonedSubmitter?.uuid }),
    ]);
    expect(clonedSubmitter?.invite_via_field_uuid).toBe(conditionField?.uuid);
    expect(storage.cloneAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'cloned-template',
        recordType: 'Template',
        sourceAttachment: originalAttachment,
        uuid: clonedDocumentUuid,
      }),
    );
    expect(storage.cloneAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'cloned-attachment',
        recordType: 'ActiveStorage::Attachment',
        sourceAttachment: originalPreview,
      }),
    );
    expect(response).toMatchObject({
      id: 'cloned-template',
      documents: [
        {
          id: 'cloned-attachment',
          preview_images: [{ id: 'cloned-preview' }],
        },
      ],
    });
  });
});

function createUser(): User {
  return {
    id: 'user-1',
    accountId: 'account-1',
  } as User;
}

function createQueryBuilder(result: Template[]) {
  const builder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };

  return builder;
}

function createAttachment(
  overrides: Partial<StorageAttachment> & { filename?: string } = {},
): StorageAttachment {
  return {
    id: 'attachment-1',
    uuid: 'attachment-uuid',
    blobId: 'blob-1',
    blob: {
      id: overrides.blobId ?? 'blob-1',
      filename: overrides.filename ?? 'document.pdf',
    } as StorageBlob,
    ...overrides,
  } as StorageAttachment;
}
