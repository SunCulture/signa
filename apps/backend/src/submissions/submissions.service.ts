import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import {
  Brackets,
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { throwDatabaseErrors, throwIfNotFound } from '../common/utils/error';
import { StorageService } from '../storage/storage.service';
import { UploadedBufferFile } from '../storage/storage.types';
import { Submitter } from '../submitters/entities/submitter.entity';
import { TemplateFolder } from '../templates/entities/template-folder.entity';
import { Template } from '../templates/entities/template.entity';
import { TemplatesService } from '../templates/templates.service';
import {
  TemplateField,
  TemplateSubmitter,
} from '../templates/types/template-json';
import { User } from '../users/entities/user.entity';
import { CreateSubmissionFromPdfDto } from './dto/create-submission-from-pdf.dto';
import {
  CreateSubmissionDto,
  CreateSubmissionSubmitterDto,
} from './dto/create-submission.dto';
import { DeleteSubmissionQueryDto } from './dto/delete-submission-query.dto';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
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
    private readonly dataSource: DataSource,
    private readonly templatesService: TemplatesService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
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

  async createSubmission(
    user: User,
    input: CreateSubmissionDto,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    const template = await this.findTemplateForCreate(user, input.template_id);

    const submission = await this.persistSubmissionFromTemplate(
      user,
      template,
      input,
      true,
    );

    return submission.submitters.map((submitter) =>
      this.toSubmitterResponse(submitter, submission, {
        includeValues: true,
        includeDocuments: false,
        includeUrls: true,
      }),
    );
  }

  async createSubmissionFromPdf(
    user: User,
    input: CreateSubmissionFromPdfDto,
    multipartFiles?: Record<string, UploadedBufferFile[]>,
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

    return this.createSubmission(user, {
      ...input,
      template_id: template.id,
    });
  }

  async getSubmissionDocuments(
    user: User,
    submissionId: string,
  ): Promise<SubmissionDocumentsResponseDto> {
    const submission = await this.findAccountSubmissionOrFail(
      user,
      submissionId,
      true,
    );

    return {
      id: submission.id,
      documents: await this.serializeSubmissionDocuments(submission),
    };
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
  ): Promise<Submission> {
    return this.dataSource.transaction(async (manager) => {
      const resolution = this.resolveSubmitters(template, input);
      const resolvedSubmitters = resolution.submitters;
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
        input,
        withTemplate,
        resolution.forceTemplateFieldsSnapshot,
      );
      const order = input.submitters_order ?? input.order ?? 'preserved';

      const submission = await manager.getRepository(Submission).save(
        manager.getRepository(Submission).create({
          accountId: user.accountId,
          createdByUserId: user.id,
          templateId: withTemplate ? template.id : null,
          template,
          name: input.name ?? null,
          source: 'api',
          submittersOrder: order,
          preferences: this.buildSubmissionPreferences(input),
          variables: input.variables ?? {},
          expireAt: input.expire_at ? new Date(input.expire_at) : null,
          templateFields,
          templateSchema: templateFields ? template.schema : null,
          templateSubmitters,
          variablesSchema: template.variablesSchema,
        }),
      );

      const savedSubmitters: Submitter[] = [];

      for (const [index, resolved] of resolvedSubmitters.entries()) {
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
                  input,
                  order,
                  index,
                ),
              ),
          );

        savedSubmitters.push(submitter);

        if (submitter.completedAt) {
          await this.createSubmissionEvent(
            manager,
            user.accountId,
            submission.id,
            submitter.id,
            'api_complete_form',
          );
        }
      }

      submission.template = template;
      submission.createdByUser = user;
      submission.submitters = savedSubmitters;
      submission.submissionEvents = [];

      return submission;
    });
  }

  private async createSubmissionEvent(
    manager: EntityManager,
    accountId: string,
    submissionId: string,
    submitterId: string,
    eventType: string,
  ): Promise<void> {
    await manager.getRepository(SubmissionEvent).save(
      manager.getRepository(SubmissionEvent).create({
        accountId,
        submissionId,
        submitterId,
        eventType,
        eventTimestamp: new Date(),
        data: {},
      }),
    );
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
    order: string,
    index: number,
  ): Partial<Submitter> {
    const sendEmail = resolved.input.send_email ?? input.send_email ?? true;
    const sendSms = resolved.input.send_sms ?? input.send_sms ?? false;
    const isOrderSent = order === 'random' || index === 0;
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
        ...(Object.keys(values).length ? { default_values: values } : {}),
      },
      sentAt:
        sendEmail && resolved.input.email && isOrderSent ? new Date() : null,
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
    try {
      return await this.submissions.findOneOrFail({
        where: {
          id: submissionId,
          accountId: user.accountId,
        },
        relations: includeRelations
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
          : undefined,
        order: includeRelations
          ? {
              submitters: {
                id: 'ASC',
              },
              submissionEvents: {
                id: 'ASC',
              },
            }
          : undefined,
      });
    } catch (error) {
      throwIfNotFound(error, 'Submission not found');
    }
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
      audit_log_url: null,
      combined_document_url: null,
      variables: submission.variables ?? {},
      submitters: submitters.map((submitter) =>
        this.toSubmitterResponse(submitter, submission, {
          includeValues: options.includeValues,
          includeDocuments: options.includeDocuments,
          includeUrls: false,
        }),
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
        ? { documents: await this.serializeSubmissionDocuments(submission) }
        : {}),
      ...(options.includeFields
        ? {
            fields:
              submission.templateFields ?? submission.template?.fields ?? [],
          }
        : {}),
    };
  }

  private toSubmitterResponse(
    submitter: Submitter,
    submission: Submission,
    options: SerializeSubmitterOptions,
  ): SubmissionSubmitterResponseDto {
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
        ? this.serializeSubmitterValues(submitter, submission)
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

  private serializeSubmitterValues(
    submitter: Submitter,
    submission: Submission,
  ): { field: string; value: unknown }[] {
    const fields =
      submission.templateFields ?? submission.template?.fields ?? [];

    return Object.entries(submitter.values).map(([fieldUuid, value]) => ({
      field:
        fields.find((field) => field.uuid === fieldUuid)?.name ?? fieldUuid,
      value,
    }));
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

    return orderedAttachments.map((attachment) => ({
      name:
        getSchemaDocumentName(schema, attachment.uuid) ??
        getBaseName(attachment.blob.filename),
      url: this.storageService.createBlobProxyUrl(attachment.blob),
    }));
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

function normalizeEmail(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value: string | undefined): string | null {
  return value?.replace(/[^0-9+]/g, '') || null;
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
