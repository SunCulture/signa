import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import {
  Brackets,
  DataSource,
  EntityManager,
  EntityNotFoundError,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { AccountsService } from '../accounts/accounts.service';
import { throwDatabaseErrors } from '../common/utils/error';
import { EmailMessage } from '../mail/entities/email-message.entity';
import { runtimeEvents } from '../runtime/runtime-events';
import { StorageService } from '../storage/storage.service';
import { UploadedBufferFile } from '../storage/storage.types';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { Submitter } from '../submitters/entities/submitter.entity';
import { TemplateFolder } from '../templates/entities/template-folder.entity';
import { Template } from '../templates/entities/template.entity';
import { TemplatesService } from '../templates/templates.service';
import {
  TemplateField,
  TemplateSubmitter,
} from '../templates/types/template-json';
import { User } from '../users/entities/user.entity';
import { CreateSubmissionFromDocxDto } from './dto/create-submission-from-docx.dto';
import { CreateSubmissionFromHtmlDto } from './dto/create-submission-from-html.dto';
import { CreateSubmissionFromPdfDto } from './dto/create-submission-from-pdf.dto';
import {
  CreateSubmissionBatchDto,
  CreateSubmissionAliasDto,
  CreateSubmissionDto,
  CreateSubmissionSubmitterDto,
} from './dto/create-submission.dto';
import { DeleteSubmissionQueryDto } from './dto/delete-submission-query.dto';
import { EventFeedResponseDto } from './dto/event-feed-response.dto';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { SendEmailResponseDto } from './dto/send-email-response.dto';
import { SubmissionMailEventsResponseDto } from './dto/submission-mail-event-response.dto';
import { SubmissionEventLogResponseDto } from './dto/submission-event-log-response.dto';
import { SubmissionInitResponseDto } from './dto/submission-init-response.dto';
import {
  SubmissionDeleteResponseDto,
  SubmissionDocumentResponseDto,
  SubmissionDocumentsResponseDto,
  SubmissionEventResponseDto,
  SubmissionResponseDto,
  SubmissionSubmitterResponseDto,
  SubmissionsListResponseDto,
} from './dto/submission-response.dto';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';
import {
  buildSubmissionEventData,
  type SubmissionRequestMetadata,
} from './submission-event-data';
import { buildSubmissionEventLog } from './submission-event-log.mapper';
import { SubmissionDocumentsService } from './submission-documents.service';
import { DocumentGenerationQueueService } from './document-generation-queue.service';
import { OwnerAutoSignService } from './owner-auto-sign.service';
import { SubmitterValueNormalizer } from './submitter-value-normalizer.service';

@Injectable()
export class SubmissionsService {
  private readonly defaultLimit = 10;
  private readonly maxLimit = 100;

  constructor(
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    @InjectRepository(Template)
    private readonly templates: Repository<Template>,
    @InjectRepository(EmailMessage)
    private readonly emailMessages: Repository<EmailMessage>,
    private readonly dataSource: DataSource,
    private readonly templatesService: TemplatesService,
    private readonly storageService: StorageService,
    private readonly accountsService: AccountsService,
    private readonly config: ConfigService,
    private readonly submissionDocumentsService: SubmissionDocumentsService,
    private readonly documentGenerationQueue: DocumentGenerationQueueService,
    private readonly events: EventEmitter2,
    private readonly submitterValueNormalizer: SubmitterValueNormalizer,
    private readonly ownerAutoSign: OwnerAutoSignService,
  ) {}

  async listSubmissions(
    user: User,
    query: ListSubmissionsQueryDto,
  ): Promise<SubmissionsListResponseDto> {
    const builder = this.submissions
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.submitters', 'submitter')
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('template.folder', 'templateFolder')
      .leftJoinAndSelect('templateFolder.parentFolder', 'parentFolder')
      .leftJoinAndSelect('submission.createdByUser', 'createdByUser')
      .where('submission.account_id = :accountId', {
        accountId: user.accountId,
      });

    this.applyListFilters(builder, query);

    const submissions = await builder
      .orderBy('submission.id', 'DESC')
      .addOrderBy('submitter.id', 'ASC')
      .limit(Math.min(query.limit ?? this.defaultLimit, this.maxLimit))
      .getMany();

    return {
      data: await Promise.all(
        submissions.map((submission) =>
          this.toSubmissionResponse(submission, {
            includeEvents: false,
            includeDocuments: false,
            includeValues: false,
            includeFields: this.includes(query.include, 'fields'),
          }),
        ),
      ),
      pagination: {
        count: submissions.length,
        next: submissions.at(-1)?.id ?? null,
        prev: submissions[0]?.id ?? null,
      },
    };
  }

  async getSubmission(
    user: User,
    submissionId: string,
    include?: string,
  ): Promise<SubmissionResponseDto> {
    return this.toSubmissionResponse(
      await this.findAccountSubmissionOrFail(user, submissionId, true),
      {
        includeEvents: true,
        includeDocuments: true,
        includeValues: true,
        includeFields: this.includes(include, 'fields'),
      },
    );
  }

  async getSubmissionEvents(
    user: User,
    submissionId: string,
  ): Promise<SubmissionEventLogResponseDto> {
    const submission = await this.findAccountSubmissionOrFail(
      user,
      submissionId,
      true,
    );

    return {
      data: buildSubmissionEventLog(submission),
    };
  }

  async createSubmission(
    user: User,
    input:
      | CreateSubmissionDto
      | CreateSubmissionBatchDto
      | CreateSubmissionDto[],
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    const submissions = await this.createSubmissionRecords(
      user,
      input,
      metadata,
    );

    return (
      await Promise.all(
        submissions.map((submission) =>
          this.serializeCreatedSubmitters(submission),
        ),
      )
    ).flat();
  }

  async createSubmissionFromAlias(
    user: User,
    input: CreateSubmissionAliasDto,
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    const submissions = await this.createSubmissionRecordsFromAlias(
      user,
      input,
      metadata,
    );

    return (
      await Promise.all(
        submissions.map((submission) =>
          this.serializeCreatedSubmitters(submission),
        ),
      )
    ).flat();
  }

  async createSubmissionInit(
    user: User,
    input: CreateSubmissionAliasDto,
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmissionInitResponseDto> {
    const submissions = await this.createSubmissionRecordsFromAlias(
      user,
      input,
      metadata,
    );
    const submitters = (
      await Promise.all(
        submissions.map((submission) =>
          this.serializeCreatedSubmitters(submission),
        ),
      )
    ).flat();

    if (submissions.length === 1) {
      const [submission] = submissions;

      return {
        id: submission.id,
        submitters,
        expire_at: submission.expireAt,
        created_at: submission.createdAt,
      };
    }

    return { submitters };
  }

  private async createSubmissionRecord(
    user: User,
    input: CreateSubmissionDto,
    metadata?: SubmissionRequestMetadata,
  ): Promise<Submission> {
    const template = await this.findTemplateForCreate(user, input.template_id);

    const submission = await this.persistSubmissionFromTemplate(
      user,
      template,
      input,
      true,
      metadata,
    );

    await this.processInitiallyCompletedSubmitters(submission);
    this.emitInitialSubmitterInvitations(submission);
    this.events.emit(runtimeEvents.submissionCreated, {
      accountId: submission.accountId,
      submissionId: submission.id,
      templateId: submission.templateId,
    });

    return submission;
  }

  private async createSubmissionRecords(
    user: User,
    input:
      | CreateSubmissionDto
      | CreateSubmissionBatchDto
      | CreateSubmissionDto[],
    metadata?: SubmissionRequestMetadata,
  ): Promise<Submission[]> {
    const inputs = normalizeCreateSubmissionBatch(input);

    if (!inputs.length) {
      throw new UnprocessableEntityException({
        error: 'Invalid submission params',
      });
    }

    const submissions: Submission[] = [];

    for (const item of inputs) {
      submissions.push(await this.createSubmissionRecord(user, item, metadata));
    }

    return submissions;
  }

  private serializeCreatedSubmitters(
    submission: Submission,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return Promise.all(
      submission.submitters.map((submitter) =>
        this.toSubmitterResponse(submitter, submission, {
          includeValues: true,
          includeDocuments: false,
          includeUrls: true,
        }),
      ),
    );
  }

  private async createSubmissionRecordsFromAlias(
    user: User,
    input: CreateSubmissionAliasDto,
    metadata?: SubmissionRequestMetadata,
  ): Promise<Submission[]> {
    if (!input.template_id) {
      throw new UnprocessableEntityException({ error: 'Template not found' });
    }

    const emails = parseEmailList(input.emails ?? input.email);

    if (emails.length && !input.submitters?.length) {
      const submissions: Submission[] = [];

      for (const email of emails) {
        submissions.push(
          await this.createSubmissionRecord(
            user,
            {
              ...input,
              template_id: input.template_id,
              submitters: [{ email }],
            },
            metadata,
          ),
        );
      }

      return submissions;
    }

    return [
      await this.createSubmissionRecord(
        user,
        {
          ...input,
          template_id: input.template_id,
          submitters: input.submitters ?? [],
        },
        metadata,
      ),
    ];
  }

  async createSubmissionFromPdf(
    user: User,
    input: CreateSubmissionFromPdfDto,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    const template = await this.templatesService.createBackingTemplateFromPdf(
      user,
      {
        name: input.name,
        folder_name: input.folder_name ?? TemplateFolder.DEFAULT_NAME,
        documents: input.documents,
        flatten: input.flatten,
        remove_tags: input.remove_tags,
        shared_link: false,
      },
      multipartFiles,
    );

    if (input.template_ids?.length) {
      await this.mergeTemplateIdsIntoBackingTemplate(
        user,
        template,
        input.template_ids,
      );
    }

    return this.createSubmission(
      user,
      {
        ...input,
        template_id: template.id,
      },
      metadata,
    );
  }

  async createSubmissionFromHtml(
    user: User,
    input: CreateSubmissionFromHtmlDto,
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    const template = await this.templatesService.createBackingTemplateFromHtml(
      user,
      {
        documents: input.documents,
        folder_name: input.folder_name ?? TemplateFolder.DEFAULT_NAME,
        name: input.name,
        shared_link: false,
      },
    );

    if (input.template_ids?.length) {
      await this.mergeTemplateIdsIntoBackingTemplate(
        user,
        template,
        input.template_ids,
      );
    }

    return this.createSubmission(
      user,
      {
        ...input,
        template_id: template.id,
      },
      metadata,
    );
  }

  async createSubmissionFromDocx(
    user: User,
    input: CreateSubmissionFromDocxDto,
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    const template = await this.templatesService.createBackingTemplateFromDocx(
      user,
      {
        documents: input.documents,
        folder_name: input.folder_name ?? TemplateFolder.DEFAULT_NAME,
        name: input.name,
        shared_link: false,
      },
    );

    if (input.template_ids?.length) {
      await this.mergeTemplateIdsIntoBackingTemplate(
        user,
        template,
        input.template_ids,
      );
    }

    return this.createSubmission(
      user,
      {
        ...input,
        template_id: template.id,
      },
      metadata,
    );
  }

  private async mergeTemplateIdsIntoBackingTemplate(
    user: User,
    backingTemplate: Template,
    templateIds: string[],
  ): Promise<void> {
    const sourceTemplates = await this.templates.find({
      where: templateIds.map((id) => ({
        id,
        accountId: user.accountId,
      })),
    });
    const sourceTemplatesById = new Map(
      sourceTemplates.map((template) => [template.id, template]),
    );
    const orderedSourceTemplates = templateIds.map((id) => {
      const template = sourceTemplatesById.get(id);

      if (!template || template.archivedAt) {
        throw new UnprocessableEntityException({
          error: `Template ${id} not found`,
        });
      }

      return template;
    });
    const submitterUuidMap = new Map<string, string>();
    const mergedSubmitters = [...backingTemplate.submitters];

    for (const sourceTemplate of orderedSourceTemplates) {
      for (const sourceSubmitter of sourceTemplate.submitters.map((submitter) =>
        this.ensureTemplateSubmitterUuid(submitter),
      )) {
        const matchingSubmitter = mergedSubmitters.find(
          (submitter) =>
            submitter.name.toLowerCase() === sourceSubmitter.name.toLowerCase(),
        );

        if (matchingSubmitter?.uuid) {
          submitterUuidMap.set(sourceSubmitter.uuid, matchingSubmitter.uuid);
          continue;
        }

        const nextUuid = randomUUID();
        submitterUuidMap.set(sourceSubmitter.uuid, nextUuid);
        mergedSubmitters.push({
          ...sourceSubmitter,
          uuid: nextUuid,
        });
      }
    }

    const mergedSchema = [...backingTemplate.schema];
    const mergedFields = [...backingTemplate.fields];

    for (const sourceTemplate of orderedSourceTemplates) {
      const attachmentUuidMap =
        await this.cloneTemplateDocumentsIntoBackingTemplate(
          sourceTemplate,
          backingTemplate,
          mergedSchema,
        );

      for (const field of sourceTemplate.fields) {
        mergedFields.push({
          ...structuredClone(field),
          uuid: randomUUID(),
          submitter_uuid:
            submitterUuidMap.get(field.submitter_uuid ?? '') ??
            field.submitter_uuid,
          areas: (field.areas ?? []).map((area) => ({
            ...area,
            attachment_uuid: area.attachment_uuid
              ? attachmentUuidMap.get(area.attachment_uuid)
              : area.attachment_uuid,
          })),
        });
      }
    }

    backingTemplate.submitters = mergedSubmitters;
    backingTemplate.schema = mergedSchema;
    backingTemplate.fields = mergedFields;

    await this.templates.save(backingTemplate);
  }

  private async cloneTemplateDocumentsIntoBackingTemplate(
    sourceTemplate: Template,
    backingTemplate: Template,
    mergedSchema: Template['schema'],
  ): Promise<Map<string, string>> {
    const sourceAttachments = await this.storageService.findRecordAttachments({
      recordType: 'Template',
      recordId: sourceTemplate.id,
      name: 'documents',
    });
    const sourceAttachmentsByUuid = new Map(
      sourceAttachments.map((attachment) => [attachment.uuid, attachment]),
    );
    const attachmentUuidMap = new Map<string, string>();

    for (const schemaItem of sourceTemplate.schema) {
      const sourceAttachmentUuid = schemaItem.attachment_uuid;

      if (!sourceAttachmentUuid) {
        continue;
      }

      const sourceAttachment =
        sourceAttachmentsByUuid.get(sourceAttachmentUuid);

      if (!sourceAttachment) {
        continue;
      }

      const clonedAttachment = await this.cloneTemplateDocumentAttachment(
        sourceAttachment,
        backingTemplate.id,
      );

      attachmentUuidMap.set(sourceAttachmentUuid, clonedAttachment.uuid);
      mergedSchema.push({
        ...structuredClone(schemaItem),
        attachment_uuid: clonedAttachment.uuid,
      });
    }

    return attachmentUuidMap;
  }

  private async cloneTemplateDocumentAttachment(
    sourceAttachment: StorageAttachment,
    backingTemplateId: string,
  ): Promise<StorageAttachment> {
    const clonedAttachment = await this.storageService.cloneAttachment({
      sourceAttachment,
      name: 'documents',
      recordType: 'Template',
      recordId: backingTemplateId,
      uuid: randomUUID(),
    });
    const previewAttachments = await this.storageService.findPreviewAttachments(
      sourceAttachment.id,
    );

    for (const preview of previewAttachments) {
      await this.storageService.cloneAttachment({
        sourceAttachment: preview,
        name: 'preview_images',
        recordType: 'ActiveStorage::Attachment',
        recordId: clonedAttachment.id,
      });
    }

    return clonedAttachment;
  }

  async getSubmissionDocuments(
    user: User,
    submissionId: string,
    options: { merge?: boolean } = {},
  ): Promise<SubmissionDocumentsResponseDto> {
    const submission = await this.findAccountSubmissionOrFail(
      user,
      submissionId,
      true,
    );

    return {
      id: submission.id,
      documents: await this.serializeGeneratedSubmissionDocuments(
        submission,
        options,
      ),
    };
  }

  async listFormEvents(
    user: User,
    type: string,
    query: EventFeedQuery,
  ): Promise<EventFeedResponseDto> {
    const eventType = `form.${type}`;
    const builder = this.submitters
      .createQueryBuilder('submitter')
      .leftJoinAndSelect('submitter.submission', 'submission')
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('template.folder', 'templateFolder')
      .leftJoinAndSelect('templateFolder.parentFolder', 'parentFolder')
      .leftJoinAndSelect('submission.submitters', 'submissionSubmitter')
      .where('submitter.account_id = :accountId', {
        accountId: user.accountId,
      })
      .andWhere('submitter.completed_at IS NOT NULL');

    applyCompletedAtCursor(builder, 'submitter.completed_at', query);

    const submitters = await builder
      .orderBy('submitter.completed_at', 'DESC')
      .limit(this.parseEventLimit(query.limit))
      .getMany();

    return {
      data: await Promise.all(
        submitters.map(async (submitter) => ({
          event_type: eventType,
          timestamp: submitter.completedAt!,
          data: await this.toSubmitterWebhookData(submitter),
        })),
      ),
      pagination: buildTimestampPagination(
        submitters.map((submitter) => submitter.completedAt),
      ),
    };
  }

  async listSubmissionEvents(
    user: User,
    type: string,
    query: EventFeedQuery,
  ): Promise<EventFeedResponseDto> {
    const eventType = `submission.${type}`;
    const builder = this.submissions
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.submitters', 'submitter')
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('template.folder', 'templateFolder')
      .leftJoinAndSelect('submission.createdByUser', 'createdByUser')
      .where('submission.account_id = :accountId', {
        accountId: user.accountId,
      })
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM submitters pending_submitter WHERE pending_submitter.submission_id = submission.id AND pending_submitter.completed_at IS NULL)',
      )
      .andWhere(
        'EXISTS (SELECT 1 FROM submitters completed_submitter WHERE completed_submitter.submission_id = submission.id AND completed_submitter.completed_at IS NOT NULL)',
      )
      .addSelect(
        '(SELECT MAX(event_submitter.completed_at) FROM submitters event_submitter WHERE event_submitter.submission_id = submission.id)',
        'completed_at_cursor',
      );

    applyCompletedAtCursor(
      builder,
      '(SELECT MAX(cursor_submitter.completed_at) FROM submitters cursor_submitter WHERE cursor_submitter.submission_id = submission.id)',
      query,
    );

    const { entities, raw } = await builder
      .orderBy('completed_at_cursor', 'DESC')
      .limit(this.parseEventLimit(query.limit))
      .getRawAndEntities();
    const rows = raw as Array<{ completed_at_cursor?: string | Date | null }>;
    const timestamps = rows.map((row) => parseDate(row.completed_at_cursor));

    return {
      data: await Promise.all(
        entities.map(async (submission, index) => ({
          event_type: eventType,
          timestamp: timestamps[index] ?? submission.updatedAt,
          data: (await this.toSubmissionResponse(submission, {
            includeDocuments: true,
            includeEvents: false,
            includeFields: false,
            includeValues: true,
          })) as unknown as Record<string, unknown>,
        })),
      ),
      pagination: buildTimestampPagination(timestamps),
    };
  }

  async resendSubmissionEmail(
    user: User,
    submissionId: string,
  ): Promise<SendEmailResponseDto> {
    const submission = await this.findAccountSubmissionOrFail(
      user,
      submissionId,
      true,
    );
    const submitters = (submission.submitters ?? []).filter(
      isPendingEmailCandidate,
    );

    this.emitSubmitterInvitations(submitters);

    return buildQueuedEmailResponse(submitters.length);
  }

  async listSubmissionMailEvents(
    user: User,
    submissionId: string,
  ): Promise<SubmissionMailEventsResponseDto> {
    await this.findAccountSubmissionOrFail(user, submissionId, false);
    const messages = await this.emailMessages.find({
      where: {
        accountId: user.accountId,
        submissionId,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      take: 100,
    });

    return {
      data: messages.map((message) => ({
        id: message.id,
        template: message.template,
        subject: message.subject,
        recipients: message.recipients,
        status: message.status,
        message_id: message.messageId,
        submitter_id: message.submitterId,
        attempt: message.attempt,
        job_id: message.jobId,
        last_error_message: message.lastErrorMessage,
        provider_response: message.providerResponse,
        sent_at: message.sentAt,
        skipped_at: message.skippedAt,
        failed_at: message.failedAt,
        created_at: message.createdAt,
      })),
    };
  }

  async sendSubmitterEmail(
    user: User,
    submitterId: string,
  ): Promise<SendEmailResponseDto> {
    const submitter = await this.submitters.findOne({
      where: {
        id: submitterId,
        accountId: user.accountId,
      },
      relations: {
        submission: {
          template: true,
          submitters: true,
        },
      },
    });

    if (!submitter) {
      throw new UnprocessableEntityException({ error: 'Submitter not found' });
    }

    const submitters = isPendingEmailCandidate(submitter) ? [submitter] : [];

    this.emitSubmitterInvitations(submitters);

    return buildQueuedEmailResponse(submitters.length);
  }

  async sendCompletedSubmissionEmail(input: {
    email?: string;
    submissionSlug?: string;
    submitterSlug?: string;
    templateSlug?: string;
  }): Promise<SendEmailResponseDto> {
    const submitter = await this.findCompletedSubmitterForEmail(input);

    if (!submitter) {
      throw new UnprocessableEntityException({ error: 'Submitter not found' });
    }

    this.events.emit(runtimeEvents.submitterDocumentsCopyRequested, {
      submitterId: submitter.id,
      accountId: submitter.accountId,
    });

    return buildQueuedEmailResponse(1);
  }

  async deleteSubmission(
    user: User,
    submissionId: string,
    query: DeleteSubmissionQueryDto,
  ): Promise<SubmissionDeleteResponseDto> {
    const submission = await this.findAccountSubmissionOrFail(
      user,
      submissionId,
      false,
    );

    if (query.permanently) {
      try {
        await this.submissions.remove(submission);
        return {
          id: submission.id,
          archived_at: submission.archivedAt,
        };
      } catch (error) {
        throwDatabaseErrors(error);
      }
    }

    submission.archivedAt = new Date();

    try {
      const saved = await this.submissions.save(submission);
      this.events.emit(runtimeEvents.submissionArchived, {
        accountId: saved.accountId,
        submissionId: saved.id,
        templateId: saved.templateId,
      });
      return {
        id: saved.id,
        archived_at: saved.archivedAt,
      };
    } catch (error) {
      throwDatabaseErrors(error);
    }
  }

  private async persistSubmissionFromTemplate(
    user: User,
    template: Template,
    input: CreateSubmissionDto,
    withTemplate: boolean,
    metadata?: SubmissionRequestMetadata,
  ): Promise<Submission> {
    const preparedInput = await this.ownerAutoSign.prepareSubmittersInput(
      user,
      template,
      input,
    );

    return this.dataSource.transaction(async (manager) => {
      const resolution = this.resolveSubmitters(template, preparedInput);
      const normalizedSubmitters = await Promise.all(
        resolution.submitters.map(async (resolved) => {
          const normalized =
            await this.submitterValueNormalizer.normalizeCreateInput({
              templateFields: resolution.templateFields,
              submitterInput: resolved.input,
              submitterUuid: resolved.uuid,
            });

          return {
            resolved: {
              ...resolved,
              input: normalized.input,
            },
            pendingAttachments: normalized.pendingAttachments,
          };
        }),
      );
      const resolvedSubmitters = normalizedSubmitters.map(
        (item) => item.resolved,
      );
      const pendingAttachmentsBySubmitterUuid = new Map(
        normalizedSubmitters.map((item) => [
          item.resolved.uuid,
          item.pendingAttachments,
        ]),
      );
      const templateSubmitters = resolvedSubmitters.map(
        ({ templateSubmitter, input: submitterInput }) => ({
          ...templateSubmitter,
          ...(submitterInput.order !== undefined
            ? { order: submitterInput.order }
            : {}),
        }),
      );
      const templateFields = this.buildSubmissionFields(
        resolution.templateFields,
        resolvedSubmitters,
        preparedInput,
        withTemplate,
        resolution.forceTemplateFieldsSnapshot,
      );
      const order =
        preparedInput.submitters_order ?? preparedInput.order ?? 'preserved';

      const submission = await manager.getRepository(Submission).save(
        manager.getRepository(Submission).create({
          accountId: user.accountId,
          createdByUserId: user.id,
          templateId: withTemplate ? template.id : null,
          template,
          name: preparedInput.name ?? null,
          source: 'api',
          submittersOrder: order,
          preferences: this.buildSubmissionPreferences(preparedInput),
          variables: preparedInput.variables ?? {},
          expireAt: preparedInput.expire_at
            ? new Date(preparedInput.expire_at)
            : null,
          templateFields,
          templateSchema: templateFields ? template.schema : null,
          templateSubmitters,
          variablesSchema: template.variablesSchema,
        }),
      );

      const savedSubmitters: Submitter[] = [];

      for (const resolved of resolvedSubmitters) {
        const submitter = await manager
          .getRepository(Submitter)
          .save(
            manager
              .getRepository(Submitter)
              .create(
                this.buildSubmitterEntity(
                  user,
                  submission,
                  resolved,
                  preparedInput,
                ),
              ),
          );

        savedSubmitters.push(submitter);
        submitter.submission = submission;

        await this.submitterValueNormalizer.persistPendingAttachments(
          submitter,
          pendingAttachmentsBySubmitterUuid.get(resolved.uuid) ?? [],
        );

        if (submitter.completedAt) {
          await this.createSubmissionEvent(
            manager,
            user.accountId,
            submission.id,
            submitter.id,
            'api_complete_form',
            metadata,
          );
        }
      }

      submission.template = template;
      submission.createdByUser = user;
      submission.submitters = savedSubmitters;
      submission.submissionEvents = [];

      await this.ownerAutoSign.completeSavedSignatureSubmitters({
        manager,
        metadata,
        submission,
        user,
      });

      return submission;
    });
  }

  private async createSubmissionEvent(
    manager: EntityManager,
    accountId: string,
    submissionId: string,
    submitterId: string,
    eventType: string,
    metadata?: SubmissionRequestMetadata,
  ): Promise<void> {
    await manager.getRepository(SubmissionEvent).save(
      manager.getRepository(SubmissionEvent).create({
        accountId,
        submissionId,
        submitterId,
        eventType,
        eventTimestamp: new Date(),
        data: buildSubmissionEventData(metadata),
      }),
    );
  }

  private async processInitiallyCompletedSubmitters(
    submission: Submission,
  ): Promise<void> {
    for (const submitter of submission.submitters ?? []) {
      if (submitter.completedAt) {
        await this.submissionDocumentsService.processSubmitterCompletion(
          submitter,
        );
        await this.documentGenerationQueue.enqueueSubmitterCompletion(
          submitter.id,
        );
        this.events.emit(runtimeEvents.formCompleted, {
          accountId: submitter.accountId,
          submitterId: submitter.id,
          submissionId: submission.id,
          templateId: submission.templateId,
        });
      }
    }

    if (
      this.buildSubmissionStatus(submission, submission.submitters) ===
      'completed'
    ) {
      this.events.emit(runtimeEvents.submissionCompleted, {
        accountId: submission.accountId,
        submissionId: submission.id,
        templateId: submission.templateId,
      });
    }
  }

  private async findTemplateForCreate(
    user: User,
    templateId: string,
  ): Promise<Template> {
    const template = await this.templates.findOne({
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

    if (!template) {
      throw new UnprocessableEntityException({ error: 'Template not found' });
    }

    if (template.archivedAt) {
      throw new UnprocessableEntityException({
        error: 'Template has been archived',
      });
    }

    if (!template.fields.length) {
      throw new UnprocessableEntityException({
        error: 'Template does not contain fields',
      });
    }

    return template;
  }

  private resolveSubmitters(
    template: Template,
    input: CreateSubmissionDto,
  ): ResolvedSubmittersResult {
    let templateSubmitters = structuredClone(template.submitters).map(
      (submitter) => this.ensureTemplateSubmitterUuid(submitter),
    );
    let templateFields = structuredClone(template.fields);
    let forceTemplateFieldsSnapshot = false;

    const submitters = input.submitters
      .map((submitterInput, index): ResolvedSubmitter | null => {
        let templateSubmitter: TemplateSubmitter & { uuid: string };

        if (submitterInput.roles && submitterInput.roles.length > 1) {
          const merged = this.mergeSubmittersAndFields(
            submitterInput,
            templateSubmitters,
            templateFields,
          );

          templateSubmitters = merged.templateSubmitters;
          templateFields = merged.templateFields;
          templateSubmitter = merged.templateSubmitter;
          forceTemplateFieldsSnapshot = true;
        } else {
          templateSubmitter = this.findTemplateSubmitter(
            templateSubmitters,
            submitterInput,
            index,
          );
        }

        if (!templateSubmitter) {
          return null;
        }

        const uuid = templateSubmitter.uuid;

        const normalizedTemplateSubmitter =
          this.normalizeSubmissionTemplateSubmitter(templateSubmitter);

        if (
          !submitterInput.email &&
          !submitterInput.phone &&
          !submitterInput.name
        ) {
          return null;
        }

        return {
          input: submitterInput,
          templateSubmitter: normalizedTemplateSubmitter,
          uuid,
        };
      })
      .filter((submitter): submitter is ResolvedSubmitter => !!submitter);

    if (!submitters.length) {
      throw new UnprocessableEntityException({
        error: 'Invalid submitter params',
      });
    }

    if (submitters.length > template.submitters.length) {
      throw new UnprocessableEntityException({
        error: 'Defined more signing parties than in template',
      });
    }

    return {
      submitters,
      templateFields,
      forceTemplateFieldsSnapshot,
    };
  }

  private findTemplateSubmitter(
    templateSubmitters: Array<TemplateSubmitter & { uuid: string }>,
    submitterInput: CreateSubmissionSubmitterDto,
    index: number,
  ): TemplateSubmitter & { uuid: string } {
    const role = submitterInput.role ?? submitterInput.roles?.[0];

    const templateSubmitter =
      templateSubmitters.find(
        (submitter) =>
          submitterInput.uuid && submitter.uuid === submitterInput.uuid,
      ) ??
      templateSubmitters.find(
        (submitter) =>
          role && submitter.name.toLowerCase() === role.toLowerCase(),
      ) ??
      templateSubmitters[submitterInput.index ?? index];

    if (!templateSubmitter) {
      throw new UnprocessableEntityException({
        error: 'Invalid submitter params',
      });
    }

    return templateSubmitter;
  }

  private mergeSubmittersAndFields(
    submitterInput: CreateSubmissionSubmitterDto,
    templateSubmitters: Array<TemplateSubmitter & { uuid: string }>,
    templateFields: TemplateField[],
  ): MergedSubmitterResult {
    const roles = submitterInput.roles ?? [];
    const selectedSubmitters = roles.map((role) => {
      const submitter = templateSubmitters.find(
        (item) => item.name.toLowerCase() === role.toLowerCase(),
      );

      if (!submitter) {
        throw new UnprocessableEntityException({
          error: `${role} role doesn't exist`,
        });
      }

      return submitter;
    });
    const mergeRoleUuids = selectedSubmitters.map(
      (submitter) => submitter.uuid,
    );
    const mergedUuid = uuidV5(mergeRoleUuids.sort().join(':'));
    const mergedName =
      submitterInput.role ??
      selectedSubmitters.map((item) => item.name).join(' / ');
    const mergedSubmitters = this.buildMergedTemplateSubmitters(
      templateSubmitters,
      mergeRoleUuids,
      mergedUuid,
      mergedName,
    );
    const mergedSubmitter = mergedSubmitters.find(
      (submitter) => submitter.uuid === mergedUuid,
    );

    if (!mergedSubmitter) {
      throw new UnprocessableEntityException({
        error: 'Invalid submitter params',
      });
    }

    return {
      templateSubmitter: mergedSubmitter,
      templateSubmitters: mergedSubmitters,
      templateFields: this.mergeTemplateFields(
        templateFields,
        mergeRoleUuids,
        mergedUuid,
      ),
    };
  }

  private buildMergedTemplateSubmitters(
    templateSubmitters: Array<TemplateSubmitter & { uuid: string }>,
    mergeRoleUuids: string[],
    mergedUuid: string,
    mergedName: string,
  ): Array<TemplateSubmitter & { uuid: string }> {
    let hasMergedSubmitter = false;

    return templateSubmitters.flatMap((submitter) => {
      const next = { ...submitter };

      if (
        next.optional_invite_by_uuid &&
        mergeRoleUuids.includes(next.optional_invite_by_uuid)
      ) {
        next.optional_invite_by_uuid = mergedUuid;
      }

      if (next.invite_by_uuid && mergeRoleUuids.includes(next.invite_by_uuid)) {
        next.invite_by_uuid = mergedUuid;
      }

      if (next.linked_to_uuid && mergeRoleUuids.includes(next.linked_to_uuid)) {
        next.linked_to_uuid = mergedUuid;
      }

      if (!mergeRoleUuids.includes(next.uuid)) {
        return [next];
      }

      if (hasMergedSubmitter) {
        return [];
      }

      hasMergedSubmitter = true;
      delete next.linked_to_uuid;

      return [
        {
          ...next,
          uuid: mergedUuid,
          name: mergedName,
        },
      ];
    });
  }

  private mergeTemplateFields(
    templateFields: TemplateField[],
    mergeRoleUuids: string[],
    mergedUuid: string,
  ): TemplateField[] {
    const fieldNames = new Map<string, TemplateField>();

    return templateFields.flatMap((field) => {
      if (
        !field.submitter_uuid ||
        !mergeRoleUuids.includes(field.submitter_uuid)
      ) {
        return [field];
      }

      const next = {
        ...field,
        submitter_uuid: mergedUuid,
      };

      if (!field.name) {
        return [next];
      }

      const existingField = fieldNames.get(field.name);

      if (existingField) {
        existingField.areas = [
          ...(existingField.areas ?? []),
          ...(field.areas ?? []),
        ];

        return [];
      }

      fieldNames.set(field.name, next);

      return [next];
    });
  }

  private normalizeSubmissionTemplateSubmitter(
    submitter: TemplateSubmitter & { uuid: string },
  ): TemplateSubmitter & { uuid: string } {
    const normalized = { ...submitter };

    delete normalized.optional_invite_by_uuid;
    delete normalized.invite_by_uuid;
    delete normalized.invite_via_field_uuid;

    return normalized;
  }

  private ensureTemplateSubmitterUuid(
    submitter: TemplateSubmitter,
  ): TemplateSubmitter & { uuid: string } {
    return {
      ...submitter,
      uuid: submitter.uuid ?? randomUUID(),
    };
  }

  private buildSubmissionPreferences(
    input: CreateSubmissionDto,
  ): Record<string, unknown> {
    return {
      send_email: input.send_email ?? true,
      send_sms: input.send_sms ?? false,
      ...(input.bcc_completed ? { bcc_completed: input.bcc_completed } : {}),
      ...(input.completed_redirect_url
        ? { completed_redirect_url: input.completed_redirect_url }
        : {}),
      ...(input.reply_to ? { reply_to: input.reply_to } : {}),
    };
  }

  private buildSubmissionFields(
    templateFields: TemplateField[],
    resolvedSubmitters: ResolvedSubmitter[],
    input: CreateSubmissionDto,
    withTemplate: boolean,
    forceSnapshot: boolean,
  ): TemplateField[] | null {
    const shouldSnapshot =
      forceSnapshot ||
      !withTemplate ||
      !!input.variables ||
      resolvedSubmitters.some(
        ({ input: submitterInput }) =>
          !!submitterInput.completed ||
          !!submitterInput.values ||
          !!submitterInput.fields ||
          !!submitterInput.readonly_fields,
      );

    if (!shouldSnapshot) {
      return null;
    }

    const fields = structuredClone(templateFields);

    for (const resolved of resolvedSubmitters) {
      const submitterUuid = resolved.uuid;

      this.applyReadonlyFields(
        fields,
        submitterUuid,
        resolved.input.readonly_fields,
      );
      this.applyFieldValues(fields, submitterUuid, resolved.input.values);
      this.applyFieldConfigs(fields, submitterUuid, resolved.input.fields);
    }

    return fields;
  }

  private applyReadonlyFields(
    fields: TemplateField[],
    submitterUuid: string | undefined,
    readonlyFields?: string[],
  ): void {
    if (!submitterUuid || !readonlyFields?.length) {
      return;
    }

    for (const field of fields) {
      if (field.submitter_uuid !== submitterUuid) {
        continue;
      }

      const names = [field.name, field.name?.toLowerCase()]
        .filter((value): value is string => !!value)
        .map(normalizeFieldName);

      if (
        readonlyFields.some((name) => names.includes(normalizeFieldName(name)))
      ) {
        field.readonly = true;
      }
    }
  }

  private applyFieldValues(
    fields: TemplateField[],
    submitterUuid: string | undefined,
    values?: Record<string, unknown>,
  ): void {
    if (!submitterUuid || !values) {
      return;
    }

    for (const field of fields) {
      if (field.submitter_uuid !== submitterUuid || !field.uuid) {
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(values, field.uuid)) {
        const value = values[field.uuid];

        if (value === undefined || value === null || value === '') {
          delete field.default_value;
        } else {
          field.default_value = value;
        }
      }
    }
  }

  private applyFieldConfigs(
    fields: TemplateField[],
    submitterUuid: string | undefined,
    configs?: TemplateField[],
  ): void {
    if (!submitterUuid || !configs?.length) {
      return;
    }

    for (const field of fields) {
      if (field.submitter_uuid !== submitterUuid) {
        continue;
      }

      const config = configs.find((item) =>
        item.name
          ? item.name.toLowerCase() === field.name?.toLowerCase()
          : item.uuid === field.uuid,
      );

      if (!config) {
        continue;
      }

      field.title = config.title ?? field.title;
      field.description = config.description ?? field.description;
      field.readonly = config.readonly ?? field.readonly;
      field.required = config.required ?? field.required;
      field.preferences = {
        ...(field.preferences ?? {}),
        ...(config.preferences ?? {}),
      };

      if (Object.prototype.hasOwnProperty.call(config, 'default_value')) {
        if (
          config.default_value === undefined ||
          config.default_value === null ||
          config.default_value === ''
        ) {
          delete field.default_value;
        } else {
          field.default_value = config.default_value;
        }
      }
    }
  }

  private buildSubmitterEntity(
    user: User,
    submission: Submission,
    resolved: ResolvedSubmitter,
    input: CreateSubmissionDto,
  ): Partial<Submitter> {
    const sendEmail = resolved.input.send_email ?? input.send_email ?? true;
    const sendSms = resolved.input.send_sms ?? input.send_sms ?? false;
    const requestMessage = resolved.input.message ?? input.message;
    const values = resolved.input.values ?? {};

    return {
      accountId: user.accountId,
      submissionId: submission.id,
      uuid: resolved.uuid,
      slug: randomUUID(),
      email: normalizeEmail(resolved.input.email),
      phone: normalizePhone(resolved.input.phone),
      name: resolved.input.name ?? null,
      externalId:
        resolved.input.external_id ?? resolved.input.application_key ?? null,
      completedAt: resolved.input.completed ? new Date() : null,
      values,
      metadata: resolved.input.metadata ?? {},
      preferences: {
        ...submission.preferences,
        ...(resolved.input.preferences ?? {}),
        send_email: sendEmail,
        send_sms: sendSms,
        ...(resolved.input.completed_redirect_url
          ? { completed_redirect_url: resolved.input.completed_redirect_url }
          : {}),
        ...(resolved.input.reply_to
          ? { reply_to: resolved.input.reply_to }
          : {}),
        ...(requestMessage?.subject
          ? { request_email_subject: requestMessage.subject }
          : {}),
        ...(requestMessage?.body
          ? { request_email_body: requestMessage.body }
          : {}),
        ...(requestMessage ? { message: requestMessage } : {}),
        ...(Object.keys(values).length ? { default_values: values } : {}),
        ...(resolved.input.use_saved_signature
          ? { use_saved_signature: true }
          : {}),
        ...(resolved.input.completed_by_user_id
          ? { completed_by_user_id: resolved.input.completed_by_user_id }
          : {}),
      },
      sentAt: null,
      openedAt: null,
      declinedAt: null,
      timezone: null,
      ip: null,
      ua: null,
    };
  }

  private applyListFilters(
    builder: SelectQueryBuilder<Submission>,
    query: ListSubmissionsQueryDto,
  ): void {
    if (query.archived) {
      builder.andWhere('submission.archived_at IS NOT NULL');
    } else {
      builder.andWhere('submission.archived_at IS NULL');
    }

    if (query.template_id) {
      builder.andWhere('submission.template_id = :templateId', {
        templateId: query.template_id,
      });
    }

    if (query.slug) {
      builder.andWhere('submission.slug = :slug', { slug: query.slug });
    }

    if (query.template_folder) {
      builder.andWhere('templateFolder.name = :templateFolder', {
        templateFolder: query.template_folder,
      });
    }

    if (query.q) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('submitter.name ILIKE :q', { q: `%${query.q}%` })
            .orWhere('submitter.email ILIKE :q', { q: `%${query.q}%` })
            .orWhere('submitter.phone ILIKE :q', { q: `%${query.q}%` });
        }),
      );
    }

    if (query.status) {
      this.applyStatusFilter(builder, query.status);
    }

    if (query.after) {
      builder.andWhere('submission.id < :after', { after: query.after });
    }

    if (query.before) {
      builder.andWhere('submission.id >= :before', {
        before: String(Number(query.before) + 1),
      });
    }
  }

  private applyStatusFilter(
    builder: SelectQueryBuilder<Submission>,
    status: NonNullable<ListSubmissionsQueryDto['status']>,
  ): void {
    if (status === 'completed') {
      builder
        .andWhere(
          'EXISTS (SELECT 1 FROM submitters s WHERE s.submission_id = submission.id)',
        )
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM submitters s WHERE s.submission_id = submission.id AND s.completed_at IS NULL)',
        );
      return;
    }

    if (status === 'declined') {
      builder.andWhere(
        'EXISTS (SELECT 1 FROM submitters s WHERE s.submission_id = submission.id AND s.declined_at IS NOT NULL)',
      );
      return;
    }

    if (status === 'expired') {
      builder
        .andWhere('submission.expire_at IS NOT NULL')
        .andWhere('submission.expire_at < :now', { now: new Date() })
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM submitters s WHERE s.submission_id = submission.id AND s.declined_at IS NOT NULL)',
        );
      return;
    }

    builder
      .andWhere(
        '(submission.expire_at IS NULL OR submission.expire_at >= :now)',
        { now: new Date() },
      )
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM submitters s WHERE s.submission_id = submission.id AND s.declined_at IS NOT NULL)',
      )
      .andWhere(
        'EXISTS (SELECT 1 FROM submitters s WHERE s.submission_id = submission.id AND s.completed_at IS NULL)',
      );
  }

  private async findAccountSubmissionOrFail(
    user: User,
    submissionId: string,
    includeRelations: boolean,
  ): Promise<Submission> {
    const relations = includeRelations
      ? {
          submitters: true,
          submissionEvents: true,
          template: {
            folder: {
              parentFolder: true,
            },
          },
          createdByUser: true,
        }
      : undefined;
    const order = includeRelations
      ? ({
          submitters: {
            id: 'ASC',
          },
          submissionEvents: {
            eventTimestamp: 'ASC',
          },
        } as const)
      : undefined;

    try {
      return await this.submissions.findOneOrFail({
        where: {
          id: submissionId,
          accountId: user.accountId,
        },
        relations,
        order,
      });
    } catch (error) {
      if (!(error instanceof EntityNotFoundError)) {
        throw error;
      }
    }

    const accountContext = await this.accountsService.getTestingAccountContext(
      user.accountId,
    );

    if (accountContext.isTestMode && accountContext.productionAccountId) {
      const productionSubmission = await this.submissions.findOne({
        where: {
          accountId: accountContext.productionAccountId,
          id: submissionId,
        },
      });

      if (productionSubmission) {
        throw new NotFoundException({
          error:
            'Submission not found using testing API key; Use production API key to access production data.',
        });
      }
    } else if (accountContext.testingAccountId) {
      const testingSubmission = await this.submissions.findOne({
        where: {
          accountId: accountContext.testingAccountId,
          id: submissionId,
        },
      });

      if (testingSubmission) {
        throw new NotFoundException({
          error:
            'Submission not found using production API key; Use testing API key to access test mode data.',
        });
      }
    }

    throw new NotFoundException({ error: 'Submission not found' });
  }

  private async toSubmissionResponse(
    submission: Submission,
    options: SerializeSubmissionOptions,
  ): Promise<SubmissionResponseDto> {
    const submitters = submission.submitters ?? [];
    const status = this.buildSubmissionStatus(submission, submitters);
    const completedAt =
      status === 'completed'
        ? (submitters
            .filter((submitter) => submitter.completedAt)
            .sort((a, b) => Number(a.completedAt) - Number(b.completedAt))
            .at(-1)?.completedAt ?? null)
        : null;

    return {
      id: submission.id,
      name: submission.name,
      slug: submission.slug,
      source: submission.source,
      submitters_order: submission.submittersOrder,
      expire_at: submission.expireAt,
      created_at: submission.createdAt,
      updated_at: submission.updatedAt,
      archived_at: submission.archivedAt,
      status,
      completed_at: completedAt,
      audit_log_url:
        status === 'completed' && options.includeDocuments
          ? await this.submissionDocumentsService.getAuditTrailUrl(submission)
          : null,
      combined_document_url:
        status === 'completed' && options.includeDocuments
          ? await this.submissionDocumentsService.getCombinedDocumentUrl(
              submission,
            )
          : null,
      variables: submission.variables ?? {},
      submitters: await Promise.all(
        submitters.map((submitter) =>
          this.toSubmitterResponse(submitter, submission, {
            includeValues: options.includeValues,
            includeDocuments: options.includeDocuments,
            includeUrls: false,
          }),
        ),
      ),
      template: submission.template
        ? {
            id: submission.template.id,
            name: submission.template.name,
            external_id: submission.template.externalId,
            folder_name: this.getFolderName(submission.template.folder),
            created_at: submission.template.createdAt,
            updated_at: submission.template.updatedAt,
          }
        : null,
      created_by_user: submission.createdByUser
        ? {
            id: submission.createdByUser.id,
            email: submission.createdByUser.email,
            first_name: submission.createdByUser.firstName,
            last_name: submission.createdByUser.lastName,
          }
        : null,
      ...(options.includeEvents
        ? {
            submission_events: this.serializeEvents(
              submission.submissionEvents ?? [],
            ),
          }
        : {}),
      ...(options.includeDocuments
        ? {
            documents:
              await this.serializeGeneratedSubmissionDocuments(submission),
          }
        : {}),
      ...(options.includeFields
        ? {
            fields:
              submission.templateFields ?? submission.template?.fields ?? [],
          }
        : {}),
    };
  }

  private async toSubmitterResponse(
    submitter: Submitter,
    submission: Submission,
    options: SerializeSubmitterOptions,
  ): Promise<SubmissionSubmitterResponseDto> {
    const preferences = { ...submitter.preferences };
    delete preferences.default_values;

    return {
      id: submitter.id,
      submission_id: submitter.submissionId,
      uuid: submitter.uuid,
      email: submitter.email,
      slug: submitter.slug,
      sent_at: submitter.sentAt,
      opened_at: submitter.openedAt,
      completed_at: submitter.completedAt,
      declined_at: submitter.declinedAt,
      created_at: submitter.createdAt,
      updated_at: submitter.updatedAt,
      name: submitter.name,
      phone: submitter.phone,
      external_id: submitter.externalId,
      status: this.buildSubmitterStatus(submitter),
      role: this.findSubmitterRole(submitter, submission),
      metadata: submitter.metadata,
      preferences,
      values: options.includeValues
        ? await this.serializeSubmitterValues(submitter, submission)
        : [],
      ...(options.includeUrls
        ? { embed_src: this.buildSubmitterEmbedUrl(submitter) }
        : {}),
    };
  }

  private buildSubmissionStatus(
    submission: Submission,
    submitters: Submitter[],
  ): string {
    if (submitters.some((submitter) => submitter.declinedAt)) {
      return 'declined';
    }

    if (
      submitters.length &&
      submitters.every((submitter) => submitter.completedAt)
    ) {
      return 'completed';
    }

    if (submission.expireAt && submission.expireAt < new Date()) {
      return 'expired';
    }

    return 'pending';
  }

  private buildSubmitterStatus(submitter: Submitter): string {
    if (submitter.completedAt) {
      return 'completed';
    }

    if (submitter.declinedAt) {
      return 'declined';
    }

    if (submitter.openedAt) {
      return 'opened';
    }

    if (submitter.sentAt) {
      return 'sent';
    }

    return 'awaiting';
  }

  private emitInitialSubmitterInvitations(submission: Submission): void {
    for (const submitter of this.getInitiallyInvitedSubmitters(submission)) {
      this.events.emit(runtimeEvents.submitterInvitationRequested, {
        submitterId: submitter.id,
        accountId: submitter.accountId,
      });
    }
  }

  private getInitiallyInvitedSubmitters(submission: Submission): Submitter[] {
    const submitters = submission.submitters ?? [];

    if (submission.submittersOrder === 'random') {
      return submitters.filter(isEmailInvitationCandidate);
    }

    const [firstSubmitter] = submitters.filter(isEmailInvitationCandidate);

    return firstSubmitter ? [firstSubmitter] : [];
  }

  private emitSubmitterInvitations(submitters: Submitter[]): void {
    for (const submitter of submitters) {
      this.events.emit(runtimeEvents.submitterInvitationRequested, {
        submitterId: submitter.id,
        accountId: submitter.accountId,
      });
    }
  }

  private parseEventLimit(limit: string | undefined): number {
    return Math.min(Number(limit) || this.defaultLimit, this.maxLimit);
  }

  async getSubmitterWebhookPayload(
    submitterId: string,
  ): Promise<Record<string, unknown>> {
    const submitter = await this.submitters.findOne({
      where: { id: submitterId },
      relations: {
        submission: {
          submitters: true,
          template: {
            folder: {
              parentFolder: true,
            },
          },
          createdByUser: true,
        },
      },
    });

    if (!submitter) {
      throw new NotFoundException({ error: 'Submitter not found' });
    }

    return this.toSubmitterWebhookData(submitter);
  }

  async getSubmissionWebhookPayload(
    submissionId: string,
  ): Promise<Record<string, unknown>> {
    const submission = await this.submissions.findOne({
      where: { id: submissionId },
      relations: {
        submitters: true,
        template: {
          folder: {
            parentFolder: true,
          },
        },
        createdByUser: true,
      },
    });

    if (!submission) {
      throw new NotFoundException({ error: 'Submission not found' });
    }

    return (await this.toSubmissionResponse(submission, {
      includeDocuments: true,
      includeEvents: false,
      includeFields: false,
      includeValues: true,
    })) as unknown as Record<string, unknown>;
  }

  async getSubmissionArchiveWebhookPayload(
    submissionId: string,
  ): Promise<Record<string, unknown>> {
    const submission = await this.submissions.findOne({
      where: { id: submissionId },
      withDeleted: true,
    });

    if (!submission) {
      throw new NotFoundException({ error: 'Submission not found' });
    }

    return {
      id: submission.id,
      archived_at: submission.archivedAt,
    };
  }

  async findLatestCompletedSubmitter(
    accountId: string,
  ): Promise<Submitter | null> {
    return this.submitters
      .createQueryBuilder('submitter')
      .leftJoinAndSelect('submitter.submission', 'submission')
      .leftJoinAndSelect('submission.submitters', 'submissionSubmitter')
      .leftJoinAndSelect('submission.template', 'template')
      .where('submitter.account_id = :accountId', { accountId })
      .andWhere('submitter.completed_at IS NOT NULL')
      .orderBy('submitter.completed_at', 'DESC')
      .getOne();
  }

  async emitExpiredSubmissionEvents(limit = 100): Promise<number> {
    const submissions = await this.submissions
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('submission.submitters', 'submitter')
      .where('submission.archived_at IS NULL')
      .andWhere('submission.expire_at IS NOT NULL')
      .andWhere('submission.expire_at < NOW()')
      .andWhere('template.archived_at IS NULL')
      .andWhere(
        'NOT EXISTS (SELECT 1 FROM submitters declined_submitter WHERE declined_submitter.submission_id = submission.id AND declined_submitter.declined_at IS NOT NULL)',
      )
      .andWhere(
        'EXISTS (SELECT 1 FROM submitters pending_submitter WHERE pending_submitter.submission_id = submission.id AND pending_submitter.completed_at IS NULL)',
      )
      .limit(limit)
      .getMany();

    for (const submission of submissions) {
      this.events.emit(runtimeEvents.submissionExpired, {
        accountId: submission.accountId,
        submissionId: submission.id,
        templateId: submission.templateId,
      });
    }

    return submissions.length;
  }

  private async toSubmitterWebhookData(
    submitter: Submitter,
  ): Promise<Record<string, unknown>> {
    return {
      id: submitter.id,
      submission_id: submitter.submissionId,
      uuid: submitter.uuid,
      email: submitter.email,
      slug: submitter.slug,
      name: submitter.name,
      phone: submitter.phone,
      completed_at: submitter.completedAt,
      values: await this.serializeSubmitterValues(
        submitter,
        submitter.submission,
      ),
      documents: await this.serializeGeneratedSubmissionDocuments(
        submitter.submission,
      ),
      role: this.findSubmitterRole(submitter, submitter.submission),
      metadata: submitter.metadata ?? {},
      status: this.buildSubmitterStatus(submitter),
    };
  }

  private async findCompletedSubmitterForEmail(input: {
    email?: string;
    submissionSlug?: string;
    submitterSlug?: string;
    templateSlug?: string;
  }): Promise<Submitter | null> {
    const email = normalizeEmail(input.email);
    const builder = this.submitters
      .createQueryBuilder('submitter')
      .leftJoinAndSelect('submitter.submission', 'submission')
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('submission.submitters', 'submissionSubmitter')
      .where('submitter.completed_at IS NOT NULL');

    if (input.submitterSlug) {
      builder.andWhere('submitter.slug = :submitterSlug', {
        submitterSlug: input.submitterSlug,
      });
    } else if (input.submissionSlug && email) {
      builder
        .andWhere('submission.slug = :submissionSlug', {
          submissionSlug: input.submissionSlug,
        })
        .andWhere('LOWER(submitter.email) = :email', { email });
    } else if (input.templateSlug && email) {
      builder
        .andWhere('template.slug = :templateSlug', {
          templateSlug: input.templateSlug,
        })
        .andWhere('LOWER(submitter.email) = :email', { email });
    } else {
      return null;
    }

    return builder.orderBy('submitter.completed_at', 'DESC').getOne();
  }

  private findSubmitterRole(
    submitter: Submitter,
    submission: Submission,
  ): string {
    const templateSubmitters =
      submission.templateSubmitters ?? submission.template?.submitters ?? [];

    return (
      templateSubmitters.find((item) => item.uuid === submitter.uuid)?.name ??
      ''
    );
  }

  private async serializeSubmitterValues(
    submitter: Submitter,
    submission: Submission,
  ): Promise<
    { attachment?: Record<string, unknown>; field: string; value: unknown }[]
  > {
    const fields =
      submission.templateFields ?? submission.template?.fields ?? [];
    const attachmentsByUuid =
      await this.getSubmitterAttachmentsByUuid(submitter);

    return Object.entries(submitter.values).map(([fieldUuid, value]) => {
      const field = fields.find((candidate) => candidate.uuid === fieldUuid);
      const attachment = this.findValueAttachment(value, attachmentsByUuid);

      return {
        field: field?.name ?? fieldUuid,
        value,
        ...(attachment
          ? { attachment: this.serializeValueAttachment(attachment) }
          : {}),
      };
    });
  }

  private serializeEvents(
    events: SubmissionEvent[],
  ): SubmissionEventResponseDto[] {
    return events.map((event) => ({
      id: event.id,
      submitter_id: event.submitterId,
      event_type: event.eventType,
      event_timestamp: event.eventTimestamp,
      data: event.data,
    }));
  }

  private async serializeSubmissionDocuments(
    submission: Submission,
  ): Promise<SubmissionDocumentResponseDto[]> {
    const templateId = submission.templateId ?? submission.template?.id;

    if (!templateId) {
      return [];
    }

    const attachments = await this.storageService.findRecordAttachments({
      recordType: 'Template',
      recordId: templateId,
      name: 'documents',
    });
    const schema =
      submission.templateSchema ?? submission.template?.schema ?? [];
    const orderedAttachments = getSchemaOrderedAttachments(schema, attachments);

    return Promise.all(
      orderedAttachments.map((attachment) =>
        this.serializeDocumentAttachment(attachment, {
          name:
            getSchemaDocumentName(schema, attachment.uuid) ??
            getBaseName(attachment.blob.filename),
        }),
      ),
    );
  }

  private async serializeGeneratedSubmissionDocuments(
    submission: Submission,
    options: { merge?: boolean } = {},
  ): Promise<SubmissionDocumentResponseDto[]> {
    const attachments =
      await this.submissionDocumentsService.getSubmissionDocuments(
        submission,
        options,
      );

    return Promise.all(
      attachments.map((attachment) =>
        this.serializeDocumentAttachment(attachment, {
          name: getBaseName(attachment.blob.filename),
        }),
      ),
    );
  }

  private async serializeDocumentAttachment(
    attachment: StorageAttachment,
    options: { name: string },
  ): Promise<SubmissionDocumentResponseDto> {
    const previews = await this.storageService.findPreviewAttachments(
      attachment.id,
    );

    return {
      id: attachment.id,
      uuid: attachment.uuid,
      filename: attachment.blob.filename,
      name: options.name,
      url: this.storageService.createBlobProxyUrl(attachment.blob),
      preview_images: previews.map((preview) => ({
        id: preview.id,
        url: this.storageService.createBlobProxyUrl(preview.blob),
        filename: preview.blob.filename,
        metadata: preview.blob.metadata ?? {},
      })),
    };
  }

  private async getSubmitterAttachmentsByUuid(
    submitter: Submitter,
  ): Promise<Map<string, StorageAttachment>> {
    const attachments = await this.storageService.findRecordAttachments({
      recordType: 'Submitter',
      recordId: submitter.id,
      name: 'attachments',
    });

    return new Map(
      attachments.map((attachment) => [attachment.uuid, attachment]),
    );
  }

  private findValueAttachment(
    value: unknown,
    attachmentsByUuid: Map<string, StorageAttachment>,
  ): StorageAttachment | null {
    if (typeof value === 'string') {
      return attachmentsByUuid.get(value) ?? null;
    }

    if (Array.isArray(value)) {
      const uuid = value.find(
        (item): item is string => typeof item === 'string',
      );

      return uuid ? (attachmentsByUuid.get(uuid) ?? null) : null;
    }

    return null;
  }

  private serializeValueAttachment(
    attachment: StorageAttachment,
  ): Record<string, unknown> {
    return {
      uuid: attachment.uuid,
      filename: attachment.blob.filename,
      content_type: attachment.blob.contentType,
      url: this.storageService.createBlobProxyUrl(attachment.blob),
    };
  }

  private buildSubmitterEmbedUrl(submitter: Submitter): string {
    const apiBase = this.config.get<string>(
      'API_PUBLIC_URL',
      `http://localhost:${this.config.get<number>('PORT', 3001)}/api`,
    );
    const publicBase = apiBase.replace(/\/api\/?$/, '');

    return `${publicBase}/s/${submitter.slug}`;
  }

  private getFolderName(folder: TemplateFolder): string {
    if (folder.parentFolder) {
      return `${folder.parentFolder.name} / ${folder.name}`;
    }

    return folder.name;
  }

  private includes(value: string | undefined, key: string): boolean {
    return (
      value
        ?.split(',')
        .map((item) => item.trim())
        .includes(key) ?? false
    );
  }
}

type ResolvedSubmitter = {
  input: CreateSubmissionSubmitterDto;
  templateSubmitter: TemplateSubmitter & { uuid: string };
  uuid: string;
};

type ResolvedSubmittersResult = {
  submitters: ResolvedSubmitter[];
  templateFields: TemplateField[];
  forceTemplateFieldsSnapshot: boolean;
};

type MergedSubmitterResult = {
  templateSubmitter: TemplateSubmitter & { uuid: string };
  templateSubmitters: Array<TemplateSubmitter & { uuid: string }>;
  templateFields: TemplateField[];
};

type SerializeSubmissionOptions = {
  includeEvents: boolean;
  includeDocuments: boolean;
  includeValues: boolean;
  includeFields: boolean;
};

type SerializeSubmitterOptions = {
  includeValues: boolean;
  includeDocuments: boolean;
  includeUrls: boolean;
};

type EventFeedQuery = {
  after?: string;
  before?: string;
  limit?: string;
};

function normalizeEmail(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value: string | undefined): string | null {
  return value?.replace(/[^0-9+]/g, '') || null;
}

function isEmailInvitationCandidate(submitter: Submitter): boolean {
  return (
    !!submitter.email &&
    !submitter.completedAt &&
    !submitter.declinedAt &&
    submitter.preferences?.send_email !== false
  );
}

function isPendingEmailCandidate(submitter: Submitter): boolean {
  return (
    isEmailInvitationCandidate(submitter) &&
    !submitter.submission?.archivedAt &&
    !submitter.submission?.template?.archivedAt
  );
}

function buildQueuedEmailResponse(count: number): SendEmailResponseDto {
  return {
    count,
    message: count === 0 ? 'Email has been sent already' : 'Email queued',
  };
}

function parseEmailList(value: string[] | string | undefined): string[] {
  const values = Array.isArray(value) ? value : [value ?? ''];

  return values
    .flatMap((item) => item.split(/[\s,;]+/))
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => !!item)
    .filter((item, index, items) => items.indexOf(item) === index);
}

function normalizeCreateSubmissionBatch(
  input: CreateSubmissionDto | CreateSubmissionBatchDto | CreateSubmissionDto[],
): CreateSubmissionDto[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (isCreateSubmissionBatch(input)) {
    return input.submissions;
  }

  return [input];
}

function isCreateSubmissionBatch(
  value: CreateSubmissionDto | CreateSubmissionBatchDto,
): value is CreateSubmissionBatchDto {
  return Array.isArray((value as CreateSubmissionBatchDto).submissions);
}

function applyCompletedAtCursor<T extends ObjectLiteral>(
  builder: SelectQueryBuilder<T>,
  column: string,
  query: EventFeedQuery,
): void {
  const after = parseUnixTimestamp(query.after);
  const before = parseUnixTimestamp(query.before);

  if (after) {
    builder.andWhere(`${column} < :afterCompletedAt`, {
      afterCompletedAt: after,
    });
  }

  if (before) {
    builder.andWhere(`${column} > :beforeCompletedAt`, {
      beforeCompletedAt: before,
    });
  }
}

function buildTimestampPagination(timestamps: Array<Date | null | undefined>): {
  count: number;
  next: number | null;
  prev: number | null;
} {
  const normalized = timestamps.filter((date): date is Date => !!date);
  const next = normalized.at(-1) ?? null;
  const prev = normalized[0] ?? null;

  return {
    count: timestamps.length,
    next: next ? Math.floor(next.getTime() / 1000) : null,
    prev: prev ? Math.floor(prev.getTime() / 1000) : null,
  };
}

function parseUnixTimestamp(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const timestamp = Number(value);

  return Number.isFinite(timestamp) ? new Date(timestamp * 1000) : null;
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date;
}

function getBaseName(filename: string): string {
  return basename(filename, extname(filename));
}

function getSchemaDocumentName(
  schema: Array<Record<string, unknown>>,
  attachmentUuid: string,
): string | null {
  const name = schema.find(
    (item) => item.attachment_uuid === attachmentUuid,
  )?.name;

  return typeof name === 'string' ? name : null;
}

function getSchemaOrderedAttachments<TAttachment extends { uuid: string }>(
  schema: Array<Record<string, unknown>>,
  attachments: TAttachment[],
): TAttachment[] {
  const attachmentsByUuid = new Map(
    attachments.map((attachment) => [attachment.uuid, attachment]),
  );

  return schema
    .map((item) => item.attachment_uuid)
    .filter((uuid): uuid is string => typeof uuid === 'string')
    .map((uuid) => attachmentsByUuid.get(uuid))
    .filter((attachment) => attachment !== undefined);
}

function uuidV5(value: string): string {
  const namespaceBytes = Buffer.from('6ba7b8129dad11d180b400c04fd430c8', 'hex');
  const hash = createHash('sha1')
    .update(namespaceBytes)
    .update(Buffer.from(value))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replaceAll(' ', '_');
}
