import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { Brackets, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { throwDatabaseErrors, throwIfNotFound } from '../common/utils/error';
import { runtimeEvents } from '../runtime/runtime-events';
import { StorageService } from '../storage/storage.service';
import { UploadedBufferFile } from '../storage/storage.types';
import { User } from '../users/entities/user.entity';
import { CloneTemplateDto } from './dto/clone-template.dto';
import { CreateTemplateFromDocxDto } from './dto/create-template-from-docx.dto';
import { CreateTemplateFromHtmlDto } from './dto/create-template-from-html.dto';
import { CreateTemplateFromPdfDto } from './dto/create-template-from-pdf.dto';
import { DeleteTemplateQueryDto } from './dto/delete-template-query.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { TemplateDeleteResponseDto } from './dto/template-delete-response.dto';
import { TemplateDocumentsUpdateResponseDto } from './dto/template-documents-update-response.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateUpdateResponseDto } from './dto/template-update-response.dto';
import { TemplatesListResponseDto } from './dto/templates-list-response.dto';
import { UpdateTemplateDocumentsDto } from './dto/update-template-documents.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { DocumentConversionService } from './document-conversion.service';
import { DocxFieldTagService } from './docx-field-tag.service';
import { DynamicDocumentVersion } from './entities/dynamic-document-version.entity';
import { DynamicDocument } from './entities/dynamic-document.entity';
import { TemplateFolder } from './entities/template-folder.entity';
import { Template } from './entities/template.entity';
import { PdfAcroFormService } from './pdf-acro-form/pdf-acro-form.service';
import {
  TemplateDocumentResponse,
  TemplateField,
  TemplateSubmitter,
} from './types/template-json';

@Injectable()
export class TemplatesService {
  private readonly defaultLimit = 10;
  private readonly maxLimit = 100;

  constructor(
    @InjectRepository(Template)
    private readonly templates: Repository<Template>,
    @InjectRepository(TemplateFolder)
    private readonly folders: Repository<TemplateFolder>,
    @InjectRepository(DynamicDocument)
    private readonly dynamicDocuments: Repository<DynamicDocument>,
    @InjectRepository(DynamicDocumentVersion)
    private readonly dynamicDocumentVersions: Repository<DynamicDocumentVersion>,
    private readonly storageService: StorageService,
    private readonly pdfAcroFormService: PdfAcroFormService,
    private readonly documentConversionService: DocumentConversionService,
    private readonly docxFieldTagService: DocxFieldTagService,
    private readonly events: EventEmitter2,
  ) {}

  async listTemplates(
    user: User,
    query: ListTemplatesQueryDto,
  ): Promise<TemplatesListResponseDto> {
    const builder = this.templates
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.author', 'author')
      .leftJoinAndSelect('template.folder', 'folder')
      .leftJoinAndSelect('folder.parentFolder', 'parentFolder')
      .where('template.account_id = :accountId', { accountId: user.accountId });

    if (query.archived) {
      builder.withDeleted();
    }

    this.applyFilters(builder, query);
    await this.applyFolderFilter(builder, user.accountId, query.folder);

    const templates = await builder
      .orderBy('template.id', 'DESC')
      .limit(Math.min(query.limit ?? this.defaultLimit, this.maxLimit))
      .getMany();

    return {
      data: await Promise.all(
        templates.map((template) => this.toTemplateResponse(template)),
      ),
      pagination: {
        count: templates.length,
        next: templates.at(-1)?.id ?? null,
        prev: templates[0]?.id ?? null,
      },
    };
  }

  async getTemplate(
    user: User,
    templateId: string,
  ): Promise<TemplateResponseDto> {
    return this.toTemplateResponse(
      await this.findAccountTemplateOrFail(user, templateId),
    );
  }

  async createBackingTemplateFromPdf(
    user: User,
    input: CreateTemplateFromPdfDto,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
  ): Promise<Template> {
    const response = await this.createTemplateFromPdf(
      user,
      {
        ...input,
        shared_link: input.shared_link ?? false,
      },
      multipartFiles,
    );

    return this.findAccountTemplateOrFail(user, response.id);
  }

  async createBackingTemplateFromHtml(
    user: User,
    input: CreateTemplateFromHtmlDto,
  ): Promise<Template> {
    const response = await this.createTemplateFromHtml(user, {
      ...input,
      shared_link: input.shared_link ?? false,
    });

    return this.findAccountTemplateOrFail(user, response.id);
  }

  async createBackingTemplateFromDocx(
    user: User,
    input: CreateTemplateFromDocxDto,
  ): Promise<Template> {
    const response = await this.createTemplateFromDocx(user, {
      ...input,
      shared_link: input.shared_link ?? false,
    });

    return this.findAccountTemplateOrFail(user, response.id);
  }

  async createTemplateFromPdf(
    user: User,
    input: CreateTemplateFromPdfDto,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
  ): Promise<TemplateResponseDto> {
    const documents = await this.resolvePdfDocuments(input, multipartFiles);

    return this.createTemplateFromResolvedDocuments(user, input, documents);
  }

  async createTemplateFromHtml(
    user: User,
    input: CreateTemplateFromHtmlDto,
  ): Promise<TemplateResponseDto> {
    const documents = await this.resolveHtmlDocuments(input);

    return this.createTemplateFromResolvedDocuments(user, input, documents);
  }

  async createTemplateFromDocx(
    user: User,
    input: CreateTemplateFromDocxDto,
  ): Promise<TemplateResponseDto> {
    const documents = await this.resolveDocxDocuments(input);

    return this.createTemplateFromResolvedDocuments(user, input, documents);
  }

  private async createTemplateFromResolvedDocuments(
    user: User,
    input: Pick<
      CreateTemplateFromPdfDto,
      'external_id' | 'folder_name' | 'name' | 'shared_link'
    >,
    documents: ResolvedPdfDocument[],
  ): Promise<TemplateResponseDto> {
    const folder = await this.findOrCreateFolder(
      user,
      input.folder_name ?? TemplateFolder.DEFAULT_NAME,
    );
    const existingTemplate = input.external_id
      ? await this.templates.findOne({
          where: {
            accountId: user.accountId,
            externalId: input.external_id,
          },
          relations: {
            author: true,
            folder: {
              parentFolder: true,
            },
          },
        })
      : null;
    const template =
      existingTemplate ??
      this.templates.create({
        accountId: user.accountId,
        authorId: user.id,
        folderId: folder.id,
        fields: [],
        name: input.name ?? getBaseName(documents[0].filename),
        preferences: {},
        schema: [],
        sharedLink: input.shared_link ?? true,
        source: 'api',
        submitters: this.buildSubmitters(documents),
        variablesSchema: null,
      });

    template.folder = folder;
    template.folderId = folder.id;
    template.name = input.name ?? template.name;
    template.externalId = input.external_id ?? template.externalId;
    template.sharedLink = input.shared_link ?? template.sharedLink;
    template.source = 'api';
    template.submitters = this.mergeSubmitters(template.submitters, documents);

    const savedTemplate = await this.templates.save(template);
    const documentAttachments = await this.replaceTemplateDocuments(
      savedTemplate,
      documents,
      false,
    );
    savedTemplate.schema = documentAttachments.map(
      ({ attachment, document }) => ({
        attachment_uuid: attachment.uuid,
        name: getBaseName(document.filename),
        ...(document.dynamicSource ? { dynamic: true } : {}),
        ...(document.pendingFields ? { pending_fields: true } : {}),
      }),
    );
    savedTemplate.fields = this.normalizeDocumentFields(
      documents,
      documentAttachments,
      savedTemplate.submitters,
    );

    try {
      const saved = await this.templates.save(savedTemplate);
      this.events.emit(runtimeEvents.templateCreated, {
        accountId: saved.accountId,
        templateId: saved.id,
      });
      return this.toTemplateResponse(
        await this.findAccountTemplateOrFail(user, saved.id),
      );
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async cloneTemplate(
    user: User,
    templateId: string,
    input: CloneTemplateDto,
  ): Promise<TemplateResponseDto> {
    const originalTemplate = await this.findAccountTemplateOrFail(
      user,
      templateId,
    );
    const folder = input.folder_name
      ? await this.findOrCreateFolder(user, input.folder_name)
      : originalTemplate.folder;
    const clonedJson = this.cloneTemplateJson(originalTemplate);
    const clonedName = input.name?.trim() || `${originalTemplate.name} (Clone)`;
    const clone = this.templates.create({
      accountId: user.accountId,
      authorId: user.id,
      externalId: input.external_id ?? input.application_key ?? null,
      fields: clonedJson.fields,
      folderId: folder.id,
      name: clonedName,
      preferences: clonedJson.preferences,
      schema: clonedJson.schema,
      sharedLink: originalTemplate.sharedLink,
      source: 'api',
      submitters: clonedJson.submitters,
      variablesSchema: deepClone(originalTemplate.variablesSchema),
    });

    clone.folder = folder;
    clone.author = user;

    if (
      input.name?.trim() &&
      clone.schema.length === 1 &&
      originalTemplate.schema[0]?.name === originalTemplate.name &&
      clonedName !== `${originalTemplate.name} (Clone)`
    ) {
      clone.schema[0] = {
        ...clone.schema[0],
        name: clonedName,
      };
    }

    try {
      const savedClone = await this.templates.save(clone);
      await this.cloneTemplateAttachments(originalTemplate, savedClone);
      this.events.emit(runtimeEvents.templateCreated, {
        accountId: savedClone.accountId,
        templateId: savedClone.id,
      });
      return this.toTemplateResponse(
        await this.findAccountTemplateOrFail(user, savedClone.id),
      );
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async updateTemplate(
    user: User,
    templateId: string,
    input: UpdateTemplateDto,
  ): Promise<TemplateUpdateResponseDto> {
    const body = this.normalizeUpdateBody(input);
    const template = await this.findAccountTemplateOrFail(user, templateId, {
      withDeleted: body.archived === false,
    });

    if (body.folder_name) {
      template.folder = await this.findOrCreateFolder(user, body.folder_name);
      template.folderId = template.folder.id;
    }

    if (body.roles?.length) {
      template.submitters = this.applyRoles(template.submitters, body.roles);
    }

    if (typeof body.archived === 'boolean') {
      template.archivedAt = body.archived ? new Date() : null;
    }

    if (body.name !== undefined) {
      template.name = body.name;
    }

    if (body.external_id !== undefined) {
      template.externalId = body.external_id;
    }

    if (body.shared_link !== undefined) {
      template.sharedLink = body.shared_link;
    }

    if (body.submitters !== undefined) {
      template.submitters = body.submitters;
    }

    if (body.fields !== undefined) {
      template.fields = body.fields;
    }

    if (body.schema !== undefined) {
      template.schema = body.schema;
    }

    if (body.preferences !== undefined) {
      template.preferences = mergeTemplatePreferences(
        template.preferences,
        body.preferences,
      );
    }

    try {
      const saved = await this.templates.save(template);
      this.events.emit(runtimeEvents.templateUpdated, {
        accountId: saved.accountId,
        templateId: saved.id,
      });

      if (body.archived === true) {
        this.events.emit(runtimeEvents.templateArchived, {
          accountId: saved.accountId,
          templateId: saved.id,
        });
      }

      return {
        id: saved.id,
        updated_at: saved.updatedAt,
      };
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async getTemplateDocumentDownloadUrls(
    user: User,
    templateId: string,
  ): Promise<string[]> {
    const template = await this.findAccountTemplateOrFail(user, templateId);
    const documents = await this.serializeTemplateDocuments(template);

    return documents.map((document) => document.url);
  }

  async updateTemplateDocuments(
    user: User,
    templateId: string,
    input: UpdateTemplateDocumentsDto,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
  ): Promise<TemplateDocumentsUpdateResponseDto> {
    const template = await this.findAccountTemplateOrFail(user, templateId);
    const documents = await this.resolveTemplateUpdateDocuments(
      input,
      multipartFiles,
    );
    const oldFields = JSON.stringify(template.fields);
    const documentAttachments = await this.replaceTemplateDocuments(
      template,
      documents,
      input.merge ?? false,
    );
    const newSchema = documentAttachments.map(({ attachment, document }) => ({
      attachment_uuid: attachment.uuid,
      name: getBaseName(document.filename),
      ...(document.dynamicSource ? { dynamic: true } : {}),
      ...(document.pendingFields ? { pending_fields: true } : {}),
    }));
    const newFields = this.normalizeDocumentFields(
      documents,
      documentAttachments,
      template.submitters,
    );

    template.schema = input.merge
      ? [...template.schema, ...newSchema]
      : newSchema;
    template.fields =
      oldFields === JSON.stringify(newFields) ? template.fields : newFields;

    try {
      const saved = await this.templates.save(template);
      const changed = oldFields !== JSON.stringify(saved.fields);

      return {
        schema: newSchema,
        fields: changed ? saved.fields : null,
        submitters: changed ? saved.submitters : null,
        documents: await this.serializeTemplateDocuments(saved),
      };
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  async deleteTemplate(
    user: User,
    templateId: string,
    query: DeleteTemplateQueryDto,
  ): Promise<TemplateDeleteResponseDto> {
    const template = await this.findAccountTemplateOrFail(user, templateId, {
      withDeleted: query.permanently === true,
    });

    if (query.permanently) {
      try {
        await this.templates.remove(template);
        return {
          id: template.id,
          archived_at: template.archivedAt,
        };
      } catch (error) {
        throwDatabaseErrors(error);
      }
    }

    template.archivedAt = new Date();

    try {
      const saved = await this.templates.save(template);
      this.events.emit(runtimeEvents.templateArchived, {
        accountId: saved.accountId,
        templateId: saved.id,
      });
      return {
        id: saved.id,
        archived_at: saved.archivedAt,
      };
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  private async replaceTemplateDocuments(
    template: Template,
    documents: ResolvedPdfDocument[],
    merge: boolean,
  ): Promise<DocumentAttachment[]> {
    if (!merge) {
      await this.storageService.deleteRecordAttachments({
        recordType: 'Template',
        recordId: template.id,
        name: 'documents',
      });
      await this.dynamicDocuments.delete({ templateId: template.id });
    }

    return Promise.all(
      documents.map(async (document) => {
        const attachment = await this.storageService.createPdfAttachment({
          buffer: document.buffer,
          filename: document.filename,
          name: 'documents',
          recordType: 'Template',
          recordId: template.id,
          metadata: {
            identified: true,
            analyzed: true,
            ...(document.dynamicSource
              ? {
                  dynamic: true,
                  dynamic_source_type: document.dynamicSource.type,
                }
              : {}),
          },
        });

        if (document.dynamicSource) {
          await this.createDynamicDocumentVersion(
            template,
            attachment.uuid,
            document,
          );
        }

        return {
          attachment,
          document,
        };
      }),
    );
  }

  private async createDynamicDocumentVersion(
    template: Template,
    uuid: string,
    document: ResolvedPdfDocument,
  ): Promise<void> {
    if (!document.dynamicSource) {
      return;
    }

    const dynamicDocument = await this.dynamicDocuments.save(
      this.dynamicDocuments.create({
        body: document.dynamicSource.body,
        head: document.dynamicSource.head,
        templateId: template.id,
        uuid,
      }),
    );

    await this.dynamicDocumentVersions.save(
      this.dynamicDocumentVersions.create({
        areas: document.fields.flatMap((field) => field.areas ?? []),
        dynamicDocumentId: dynamicDocument.id,
        sha1: dynamicDocument.sha1,
      }),
    );
  }

  private async cloneTemplateAttachments(
    originalTemplate: Template,
    clonedTemplate: Template,
  ): Promise<void> {
    const originalAttachments = await this.storageService.findRecordAttachments(
      {
        recordType: 'Template',
        recordId: originalTemplate.id,
        name: 'documents',
      },
    );
    const originalAttachmentsByUuid = new Map(
      originalAttachments.map((attachment) => [attachment.uuid, attachment]),
    );

    for (const [
      index,
      originalSchemaItem,
    ] of originalTemplate.schema.entries()) {
      const originalAttachmentUuid = originalSchemaItem.attachment_uuid;
      const clonedAttachmentUuid =
        clonedTemplate.schema[index]?.attachment_uuid;

      if (!originalAttachmentUuid || !clonedAttachmentUuid) {
        continue;
      }

      const originalAttachment = originalAttachmentsByUuid.get(
        originalAttachmentUuid,
      );

      if (!originalAttachment) {
        continue;
      }

      const clonedAttachment = await this.storageService.cloneAttachment({
        sourceAttachment: originalAttachment,
        name: 'documents',
        recordType: 'Template',
        recordId: clonedTemplate.id,
        uuid: clonedAttachmentUuid,
      });
      const previews = await this.storageService.findPreviewAttachments(
        originalAttachment.id,
      );

      for (const preview of previews) {
        await this.storageService.cloneAttachment({
          sourceAttachment: preview,
          name: 'preview_images',
          recordType: 'ActiveStorage::Attachment',
          recordId: clonedAttachment.id,
        });
      }
    }
  }

  private async resolvePdfDocuments(
    input: Pick<CreateTemplateFromPdfDto, 'documents'>,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
  ): Promise<ResolvedPdfDocument[]> {
    const multipartDocuments = [
      ...(multipartFiles?.documents ?? []),
      ...(multipartFiles?.files ?? []),
      ...(multipartFiles?.file ?? []),
    ].map((file): ResolvedPdfDocument => {
      this.assertPdf(file.buffer, file.originalname, file.mimetype);
      return {
        filename: ensurePdfFilename(file.originalname),
        buffer: file.buffer,
        fields: [],
        pendingFields: false,
      };
    });

    if (multipartDocuments.length) {
      return this.extractAcroFieldsForDocuments(multipartDocuments);
    }

    const documents = input.documents ?? [];

    if (!documents.length) {
      throw new UnprocessableEntityException({ error: 'File is missing' });
    }

    const resolvedDocuments = await Promise.all(
      documents.map(async (document) => {
        const buffer = await this.resolveDocumentFile(document, {
          requireHttpsUrl: true,
        });
        this.assertPdf(buffer, document.name, 'application/pdf');

        return {
          filename: ensurePdfFilename(document.name),
          buffer,
          fields: document.fields ?? [],
          pendingFields: false,
        };
      }),
    );

    return this.extractAcroFieldsForDocuments(resolvedDocuments);
  }

  private async resolveTemplateUpdateDocuments(
    input: UpdateTemplateDocumentsDto,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
  ): Promise<ResolvedPdfDocument[]> {
    const multipartFilesList = [
      ...(multipartFiles?.documents ?? []),
      ...(multipartFiles?.files ?? []),
      ...(multipartFiles?.file ?? []),
    ];

    if (multipartFilesList.length) {
      const documents = await Promise.all(
        multipartFilesList.map((file) =>
          this.resolveUploadedTemplateDocument(file),
        ),
      );

      return this.extractAcroFieldsForDocuments(documents);
    }

    const documents = input.documents ?? [];

    if (!documents.length) {
      throw new UnprocessableEntityException({ error: 'File is missing' });
    }

    const resolvedDocuments = await Promise.all(
      documents.map(async (document) => {
        const buffer = await this.resolveDocumentFile(document, {
          requireHttpsUrl: true,
        });

        if (isDocxFilename(document.name)) {
          return this.resolveDocxBufferDocument({
            buffer,
            fields: document.fields ?? [],
            name: document.name,
          });
        }

        this.assertPdf(buffer, document.name, 'application/pdf');

        return {
          buffer,
          fields: document.fields ?? [],
          filename: ensurePdfFilename(document.name),
          pendingFields: false,
        };
      }),
    );

    return this.extractAcroFieldsForDocuments(resolvedDocuments);
  }

  private async resolveUploadedTemplateDocument(
    file: UploadedBufferFile,
  ): Promise<ResolvedPdfDocument> {
    if (isDocxFilename(file.originalname)) {
      return this.resolveDocxBufferDocument({
        buffer: file.buffer,
        fields: [],
        name: file.originalname,
      });
    }

    this.assertPdf(file.buffer, file.originalname, file.mimetype);

    return {
      buffer: file.buffer,
      fields: [],
      filename: ensurePdfFilename(file.originalname),
      pendingFields: false,
    };
  }

  private async resolveHtmlDocuments(
    input: CreateTemplateFromHtmlDto,
  ): Promise<ResolvedPdfDocument[]> {
    const documents = input.documents?.length
      ? input.documents
      : input.html
        ? [
            {
              html: input.html,
              html_footer: input.html_footer,
              html_header: input.html_header,
              name: input.name,
              size: input.size,
            },
          ]
        : [];

    if (!documents.length) {
      throw new UnprocessableEntityException({ error: 'HTML is missing' });
    }

    return Promise.all(
      documents.map(async (document, index) => {
        const rendered =
          await this.documentConversionService.renderHtmlDocument({
            html: document.html,
            htmlFooter: document.html_footer ?? input.html_footer,
            htmlHeader: document.html_header ?? input.html_header,
            name: document.name ?? input.name ?? `document-${index + 1}`,
            size: document.size ?? input.size,
          });

        return {
          buffer: rendered.buffer,
          dynamicSource: {
            body: rendered.body,
            head: rendered.head,
            type: 'html',
          },
          fields: rendered.fields,
          filename: rendered.filename,
          pendingFields: false,
        };
      }),
    );
  }

  private async resolveDocxDocuments(
    input: CreateTemplateFromDocxDto,
  ): Promise<ResolvedPdfDocument[]> {
    const documents = input.documents ?? [];

    if (!documents.length) {
      throw new UnprocessableEntityException({ error: 'File is missing' });
    }

    return Promise.all(
      documents.map(async (document) => {
        const buffer = await this.resolveDocumentFile(document, {
          requireHttpsUrl: true,
        });
        return this.resolveDocxBufferDocument({
          buffer,
          fields: document.fields ?? [],
          name: document.name,
        });
      }),
    );
  }

  private async resolveDocxBufferDocument(input: {
    buffer: Buffer;
    fields: TemplateField[];
    name: string;
  }): Promise<ResolvedPdfDocument> {
    this.assertDocx(input.buffer, input.name);
    const prepared = this.docxFieldTagService.prepareDocument(input.buffer);
    const pdfBuffer = await this.documentConversionService.convertDocxToPdf({
      buffer: prepared.buffer,
      name: input.name,
    });
    const extractedFields = await this.docxFieldTagService.extractMarkerFields({
      markers: prepared.markers,
      pdf: pdfBuffer,
    });

    return {
      buffer: pdfBuffer,
      dynamicSource: {
        body: input.buffer.toString('base64'),
        head: `docx:${input.name}:${this.documentConversionService.hashSource(input.buffer)}`,
        type: 'docx',
      },
      fields: [...extractedFields, ...input.fields],
      filename: ensurePdfFilename(getBaseName(input.name)),
      pendingFields: false,
    };
  }

  private async extractAcroFieldsForDocuments(
    documents: ResolvedPdfDocument[],
  ): Promise<ResolvedPdfDocument[]> {
    return Promise.all(
      documents.map(async (document) => {
        if (document.fields.length) {
          return document;
        }

        const extractedFields = await this.pdfAcroFormService.extractFields(
          document.buffer,
          '',
        );

        return {
          ...document,
          fields: extractedFields,
          pendingFields: extractedFields.length > 0,
        };
      }),
    );
  }

  private async resolveDocumentFile(
    document: {
      file: string;
      name: string;
    },
    options: { requireHttpsUrl?: boolean } = {},
  ): Promise<Buffer> {
    if (isUrl(document.file)) {
      if (options.requireHttpsUrl && !document.file.startsWith('https://')) {
        throw new UnprocessableEntityException({
          error: 'Only HTTPS document URLs are supported',
        });
      }

      const response = await fetch(document.file);

      if (!response.ok) {
        throw new UnprocessableEntityException({
          error: `Unable to download PDF: ${response.status}`,
        });
      }

      return Buffer.from(await response.arrayBuffer());
    }

    return Buffer.from(stripDataUrlPrefix(document.file), 'base64');
  }

  private assertPdf(
    buffer: Buffer,
    filename: string,
    contentType?: string,
  ): void {
    const isPdf =
      contentType === 'application/pdf' ||
      filename.toLowerCase().endsWith('.pdf') ||
      buffer.subarray(0, 5).toString('utf8') === '%PDF-';

    if (!isPdf) {
      throw new UnprocessableEntityException({ error: 'Invalid file type' });
    }
  }

  private assertDocx(buffer: Buffer, filename: string): void {
    const lowerName = filename.toLowerCase();
    const isZipContainer = buffer.subarray(0, 2).toString('utf8') === 'PK';

    if (!lowerName.endsWith('.docx') || !isZipContainer) {
      throw new UnprocessableEntityException({ error: 'Invalid file type' });
    }
  }

  private buildSubmitters(
    documents: ResolvedPdfDocument[],
  ): TemplateSubmitter[] {
    const roles = this.extractDocumentRoles(documents);

    if (!roles.length) {
      return [{ name: 'First Party', uuid: randomUUID() }];
    }

    return roles.map((role) => ({ name: role, uuid: randomUUID() }));
  }

  private mergeSubmitters(
    existingSubmitters: TemplateSubmitter[],
    documents: ResolvedPdfDocument[],
  ): TemplateSubmitter[] {
    const submitters = existingSubmitters.length
      ? [...existingSubmitters]
      : [{ name: 'First Party', uuid: randomUUID() }];

    for (const role of this.extractDocumentRoles(documents)) {
      if (!submitters.some((submitter) => submitter.name === role)) {
        submitters.push({ name: role, uuid: randomUUID() });
      }
    }

    return submitters;
  }

  private extractDocumentRoles(documents: ResolvedPdfDocument[]): string[] {
    return Array.from(
      new Set(
        documents
          .flatMap((document) => document.fields)
          .map((field) => (typeof field.role === 'string' ? field.role : null))
          .filter((role): role is string => !!role),
      ),
    );
  }

  private normalizeDocumentFields(
    documents: ResolvedPdfDocument[],
    attachments: DocumentAttachment[],
    submitters: TemplateSubmitter[],
  ): TemplateField[] {
    return attachments.flatMap(({ attachment, document }) =>
      document.fields.map((field) => {
        const role = typeof field.role === 'string' ? field.role : undefined;
        const submitter =
          submitters.find((item) => item.name === role) ?? submitters[0];

        return {
          ...field,
          uuid: field.uuid ?? randomUUID(),
          submitter_uuid: field.submitter_uuid ?? submitter.uuid,
          required: field.required ?? false,
          preferences: field.preferences ?? {},
          areas: (field.areas ?? []).map((area) => ({
            ...area,
            page:
              typeof area.page === 'number' && area.page > 0
                ? area.page - 1
                : area.page,
            attachment_uuid: attachment.uuid,
          })),
        };
      }),
    );
  }

  private applyFilters(
    builder: SelectQueryBuilder<Template>,
    query: ListTemplatesQueryDto,
  ): void {
    if (query.archived) {
      builder.andWhere('template.archivedAt IS NOT NULL');
    } else {
      builder.andWhere('template.archivedAt IS NULL');
    }

    if (query.q) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('template.name ILIKE :q', { q: `%${query.q}%` })
            .orWhere('template.external_id ILIKE :q', { q: `%${query.q}%` });
        }),
      );
    }

    if (query.slug) {
      builder.andWhere('template.slug = :slug', { slug: query.slug });
    }

    const externalId = query.external_id ?? query.application_key;
    if (externalId) {
      builder.andWhere('template.external_id = :externalId', { externalId });
    }

    if (query.after) {
      builder.andWhere('template.id < :after', { after: query.after });
    }

    if (query.before) {
      builder.andWhere('template.id >= :before', {
        before: String(Number(query.before) + 1),
      });
    }
  }

  private async applyFolderFilter(
    builder: SelectQueryBuilder<Template>,
    accountId: string,
    folderName?: string,
  ): Promise<void> {
    if (!folderName) {
      return;
    }

    const folders = await this.folders.find({
      where: {
        accountId,
        archivedAt: IsNull(),
      },
      relations: {
        parentFolder: true,
      },
    });
    const folderIds = folders
      .filter((folder) => this.getFolderName(folder) === folderName)
      .map((folder) => folder.id);

    if (!folderIds.length) {
      builder.andWhere('1 = 0');
      return;
    }

    builder.andWhere('template.folder_id IN (:...folderIds)', { folderIds });
  }

  private async findAccountTemplateOrFail(
    user: User,
    templateId: string,
    options: { withDeleted?: boolean } = {},
  ): Promise<Template> {
    try {
      return await this.templates.findOneOrFail({
        withDeleted: options.withDeleted,
        where: {
          id: templateId,
          accountId: user.accountId,
        },
        relations: {
          author: true,
          folder: {
            parentFolder: true,
          },
        },
      });
    } catch (error) {
      throwIfNotFound(error, 'Template not found');
    }
  }

  private async findOrCreateFolder(
    user: User,
    folderName: string,
  ): Promise<TemplateFolder> {
    const normalizedName = folderName.trim();
    const existing = await this.folders.findOne({
      where: {
        accountId: user.accountId,
        name: normalizedName,
        parentFolderId: IsNull(),
        archivedAt: IsNull(),
      },
    });

    if (existing) {
      return existing;
    }

    try {
      return await this.folders.save(
        this.folders.create({
          accountId: user.accountId,
          authorId: user.id,
          name: normalizedName,
          parentFolderId: null,
        }),
      );
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  private normalizeUpdateBody(input: UpdateTemplateDto): UpdateTemplateDto {
    return {
      ...input,
      ...(input.template ?? {}),
    };
  }

  private applyRoles(
    submitters: TemplateSubmitter[],
    roles: string[],
  ): TemplateSubmitter[] {
    const nextSubmitters = [...submitters];

    roles.forEach((role, index) => {
      const submitter = nextSubmitters[index];

      if (submitter) {
        nextSubmitters[index] = {
          ...submitter,
          name: role,
        };
        return;
      }

      nextSubmitters.push({
        name: role,
        uuid: randomUUID(),
      });
    });

    return nextSubmitters;
  }

  private cloneTemplateJson(
    template: Template,
  ): Pick<Template, 'fields' | 'preferences' | 'schema' | 'submitters'> {
    const submitters = deepClone(template.submitters);
    const fields = deepClone(template.fields);
    const schema = deepClone(template.schema);
    const preferences = deepClone(template.preferences);
    const submitterUuidMap = new Map<string, string>();
    const fieldUuidMap = new Map<string, string>();
    const attachmentUuidMap = new Map<string, string>();

    for (const submitter of submitters) {
      if (!submitter.uuid) {
        submitter.uuid = randomUUID();
        continue;
      }

      const nextUuid = randomUUID();
      submitterUuidMap.set(submitter.uuid, nextUuid);
      submitter.uuid = nextUuid;
    }

    const preferenceSubmitters = Array.isArray(preferences.submitters)
      ? preferences.submitters
      : [];

    for (const submitter of preferenceSubmitters) {
      if (!isJsonObject(submitter) || typeof submitter.uuid !== 'string') {
        continue;
      }

      submitter.uuid = submitterUuidMap.get(submitter.uuid) ?? submitter.uuid;
    }

    for (const item of schema) {
      if (typeof item.attachment_uuid !== 'string') {
        continue;
      }

      const nextUuid = randomUUID();
      attachmentUuidMap.set(item.attachment_uuid, nextUuid);
      item.attachment_uuid = nextUuid;
    }

    for (const field of fields) {
      if (field.uuid) {
        const nextUuid = randomUUID();
        fieldUuidMap.set(field.uuid, nextUuid);
        field.uuid = nextUuid;
      } else {
        field.uuid = randomUUID();
      }

      if (field.submitter_uuid) {
        field.submitter_uuid =
          submitterUuidMap.get(field.submitter_uuid) ?? field.submitter_uuid;
      }

      if (Array.isArray(field.areas)) {
        field.areas = field.areas.map((area) => ({
          ...area,
          attachment_uuid:
            typeof area.attachment_uuid === 'string'
              ? (attachmentUuidMap.get(area.attachment_uuid) ??
                area.attachment_uuid)
              : area.attachment_uuid,
        }));
      }
    }

    for (const field of fields) {
      this.rewriteFieldReferences(field, fieldUuidMap);
    }

    for (const item of schema) {
      rewriteConditions(item.conditions, fieldUuidMap);
    }

    for (const submitter of submitters) {
      rewriteSubmitterReference(
        submitter,
        'optional_invite_by_uuid',
        submitterUuidMap,
      );
      rewriteSubmitterReference(submitter, 'invite_by_uuid', submitterUuidMap);
      rewriteSubmitterReference(submitter, 'linked_to_uuid', submitterUuidMap);
      rewriteSubmitterReference(
        submitter,
        'invite_via_field_uuid',
        fieldUuidMap,
      );
    }

    return { fields, preferences, schema, submitters };
  }

  private rewriteFieldReferences(
    field: TemplateField,
    fieldUuidMap: Map<string, string>,
  ): void {
    rewriteConditions(field.conditions, fieldUuidMap);

    const formula = field.preferences?.formula;

    if (typeof formula !== 'string' || fieldUuidMap.size === 0) {
      return;
    }

    field.preferences = {
      ...field.preferences,
      formula: Array.from(fieldUuidMap.entries()).reduce(
        (nextFormula, [oldUuid, newUuid]) =>
          nextFormula.replaceAll(oldUuid, newUuid),
        formula,
      ),
    };
  }

  async getTemplateWebhookPayload(
    templateId: string,
  ): Promise<Record<string, unknown>> {
    const template = await this.templates.findOne({
      where: { id: templateId },
      relations: {
        author: true,
        folder: {
          parentFolder: true,
        },
      },
    });

    if (!template) {
      throw new NotFoundException({ error: 'Template not found' });
    }

    return (await this.toTemplateResponse(template)) as unknown as Record<
      string,
      unknown
    >;
  }

  async getTemplateArchiveWebhookPayload(
    templateId: string,
  ): Promise<Record<string, unknown>> {
    const template = await this.templates.findOne({
      where: { id: templateId },
      withDeleted: true,
    });

    if (!template) {
      throw new NotFoundException({ error: 'Template not found' });
    }

    return {
      id: template.id,
      archived_at: template.archivedAt,
    };
  }

  private async toTemplateResponse(
    template: Template,
  ): Promise<TemplateResponseDto> {
    return {
      id: template.id,
      archived_at: template.archivedAt,
      fields: template.fields,
      name: template.name,
      preferences: template.preferences,
      schema: template.schema,
      slug: template.slug,
      source: template.source,
      submitters: template.submitters,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
      author_id: template.authorId,
      external_id: template.externalId,
      folder_id: template.folderId,
      shared_link: template.sharedLink,
      application_key: template.externalId,
      folder_name: this.getFolderName(template.folder),
      variables_schema: template.variablesSchema,
      author: {
        id: template.author.id,
        email: template.author.email,
        first_name: template.author.firstName,
        last_name: template.author.lastName,
      },
      documents: await this.serializeTemplateDocuments(template),
    };
  }

  private async serializeTemplateDocuments(
    template: Template,
  ): Promise<TemplateDocumentResponse[]> {
    const attachments = await this.storageService.findRecordAttachments({
      recordType: 'Template',
      recordId: template.id,
      name: 'documents',
    });
    const attachmentsByUuid = new Map(
      attachments.map((attachment) => [attachment.uuid, attachment]),
    );
    const schemaAttachmentUuids = template.schema
      .map((item) => item.attachment_uuid)
      .filter((uuid): uuid is string => typeof uuid === 'string');
    const orderedAttachments = schemaAttachmentUuids
      .map((uuid) => attachmentsByUuid.get(uuid))
      .filter((attachment) => attachment !== undefined);

    return Promise.all(
      orderedAttachments.map(async (attachment) => {
        const previews = await this.storageService.findPreviewAttachments(
          attachment.id,
        );
        const firstPreview = previews[0] ?? null;

        return {
          id: attachment.id,
          uuid: attachment.uuid,
          url: this.storageService.createBlobProxyUrl(attachment.blob),
          preview_image_url: firstPreview
            ? this.storageService.createBlobProxyUrl(firstPreview.blob)
            : null,
          preview_images: previews.map((preview) => ({
            id: preview.id,
            url: this.storageService.createBlobProxyUrl(preview.blob),
            filename: preview.blob.filename,
            metadata: preview.blob.metadata ?? {},
          })),
          filename: attachment.blob.filename,
        };
      }),
    );
  }

  private getFolderName(folder: TemplateFolder): string {
    if (folder.parentFolder) {
      return `${folder.parentFolder.name} / ${folder.name}`;
    }

    return folder.name;
  }
}

type ResolvedPdfDocument = {
  filename: string;
  buffer: Buffer;
  fields: TemplateField[];
  pendingFields: boolean;
  dynamicSource?: {
    body: string;
    head: string | null;
    type: 'docx' | 'html';
  };
};

type DocumentAttachment = {
  attachment: Awaited<ReturnType<StorageService['createPdfAttachment']>>;
  document: ResolvedPdfDocument;
};

function getBaseName(filename: string): string {
  return basename(filename, extname(filename));
}

function ensurePdfFilename(filename: string): string {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}

function stripDataUrlPrefix(value: string): string {
  const [, base64] = value.match(/^data:[^;]+;base64,(.*)$/) ?? [];

  return base64 ?? value;
}

function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isDocxFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.docx');
}

function deepClone<T>(value: T): T {
  return value == null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function mergeTemplatePreferences(
  currentPreferences: Record<string, unknown>,
  nextPreferences: Record<string, unknown>,
): Record<string, unknown> {
  return removeBlankPreferenceValues({
    ...currentPreferences,
    ...nextPreferences,
  });
}

function removeBlankPreferenceValues(
  preferences: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(preferences).filter(
      ([, value]) => !isBlankPreferenceValue(value),
    ),
  );
}

function isBlankPreferenceValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim() === '';
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (isJsonObject(value)) {
    return Object.keys(value).length === 0;
  }

  return value === undefined || value === null;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rewriteConditions(
  conditions: unknown,
  fieldUuidMap: Map<string, string>,
): void {
  if (!Array.isArray(conditions)) {
    return;
  }

  for (const condition of conditions) {
    if (!isJsonObject(condition) || typeof condition.field_uuid !== 'string') {
      continue;
    }

    condition.field_uuid =
      fieldUuidMap.get(condition.field_uuid) ?? condition.field_uuid;
  }
}

function rewriteSubmitterReference(
  submitter: TemplateSubmitter,
  key: keyof TemplateSubmitter,
  uuidMap: Map<string, string>,
): void {
  const value = submitter[key];

  if (typeof value !== 'string') {
    return;
  }

  (submitter as Record<string, unknown>)[key] = uuidMap.get(value) ?? value;
}
