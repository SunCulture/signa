import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { basename, extname } from 'node:path';
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { throwDatabaseErrors, throwIfNotFound } from '../common/utils/error';
import { runtimeEvents } from '../runtime/runtime-events';
import { StorageService } from '../storage/storage.service';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { SubmissionDocumentsService } from '../submissions/submission-documents.service';
import {
  buildSubmissionEventData,
  type SubmissionRequestMetadata,
} from '../submissions/submission-event-data';
import { TemplateField } from '../templates/types/template-json';
import { SubmitterValueNormalizer } from '../submissions/submitter-value-normalizer.service';
import { User } from '../users/entities/user.entity';
import { ListSubmittersQueryDto } from './dto/list-submitters-query.dto';
import {
  SubmitterDocumentResponseDto,
  SubmitterEventResponseDto,
  SubmitterResponseDto,
  SubmittersListResponseDto,
} from './dto/submitter-response.dto';
import { UpdateSubmitterDto } from './dto/update-submitter.dto';
import { Submitter } from './entities/submitter.entity';

@Injectable()
export class SubmittersService {
  private readonly defaultLimit = 10;
  private readonly maxLimit = 100;

  constructor(
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
    private readonly submissionDocumentsService: SubmissionDocumentsService,
    private readonly submitterValueNormalizer: SubmitterValueNormalizer,
  ) {}

  async listSubmitters(
    user: User,
    query: ListSubmittersQueryDto,
  ): Promise<SubmittersListResponseDto> {
    const builder = this.submitters
      .createQueryBuilder('submitter')
      .leftJoinAndSelect('submitter.submission', 'submission')
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('submitter.submissionEvents', 'submissionEvent')
      .where('submitter.account_id = :accountId', {
        accountId: user.accountId,
      });

    this.applyListFilters(builder, query);

    const submitters = await builder
      .orderBy('submitter.id', 'DESC')
      .addOrderBy('submissionEvent.id', 'ASC')
      .limit(Math.min(query.limit ?? this.defaultLimit, this.maxLimit))
      .getMany();

    return {
      data: await Promise.all(
        submitters.map((submitter) =>
          this.toSubmitterResponse(submitter, {
            includeTemplate: true,
            includeEvents: true,
            includeDocuments: true,
            includeValues: true,
            includeUrls: false,
            includeFields: this.includes(query.include, 'fields'),
          }),
        ),
      ),
      pagination: {
        count: submitters.length,
        next: submitters.at(-1)?.id ?? null,
        prev: submitters[0]?.id ?? null,
      },
    };
  }

  async getSubmitter(
    user: User,
    submitterId: string,
    include?: string,
  ): Promise<SubmitterResponseDto> {
    const submitter = await this.findAccountSubmitterOrFail(user, submitterId);

    if (submitter.completedAt) {
      await this.submissionDocumentsService.processSubmitterCompletion(
        submitter,
      );
    }

    return this.toSubmitterResponse(submitter, {
      includeTemplate: true,
      includeEvents: true,
      includeDocuments: true,
      includeValues: true,
      includeUrls: false,
      includeFields: this.includes(include, 'fields'),
    });
  }

  async updateSubmitter(
    user: User,
    submitterId: string,
    input: UpdateSubmitterDto,
    include?: string,
    metadata?: SubmissionRequestMetadata,
  ): Promise<SubmitterResponseDto> {
    const submitter = await this.findAccountSubmitterOrFail(user, submitterId);

    if (submitter.completedAt) {
      throw new UnprocessableEntityException({
        error: 'Submitter has already completed the submission.',
      });
    }

    if (submitter.declinedAt) {
      throw new UnprocessableEntityException({
        error: 'Submitter has already declined the submission.',
      });
    }

    const normalized = await this.submitterValueNormalizer.normalizeUpdateInput(
      submitter,
      input,
    );

    this.assignSubmissionFieldOverrides(submitter, normalized.input);
    this.assignSubmitterAttributes(submitter, normalized.input);

    if (normalized.input.completed) {
      submitter.completedAt = new Date();
      submitter.values = this.prepareCompletedValues(submitter);
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Submitter).save(submitter);
        await manager.getRepository(Submission).save(submitter.submission);

        if (normalized.input.completed) {
          await manager.getRepository(SubmissionEvent).save(
            manager.getRepository(SubmissionEvent).create({
              accountId: user.accountId,
              submissionId: submitter.submissionId,
              submitterId: submitter.id,
              eventType: 'api_complete_form',
              eventTimestamp: new Date(),
              data: buildSubmissionEventData(metadata),
            }),
          );
        }
      });

      await this.submitterValueNormalizer.persistPendingAttachments(
        submitter,
        normalized.pendingAttachments,
      );
    } catch (error) {
      throwDatabaseErrors(error);
    }

    if (
      (normalized.input.send_email && submitter.email) ||
      (normalized.input.send_sms && submitter.phone)
    ) {
      this.events.emit(runtimeEvents.submitterInvitationRequested, {
        submitterId: submitter.id,
        accountId: submitter.accountId,
      });
    }

    return this.toSubmitterResponse(submitter, {
      includeTemplate: false,
      includeEvents: false,
      includeDocuments: true,
      includeValues: true,
      includeUrls: true,
      includeFields: this.includes(include, 'fields'),
    });
  }

  private applyListFilters(
    builder: SelectQueryBuilder<Submitter>,
    query: ListSubmittersQueryDto,
  ): void {
    if (query.submission_id) {
      builder.andWhere('submitter.submission_id = :submissionId', {
        submissionId: query.submission_id,
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

    if (query.slug) {
      builder.andWhere('submitter.slug = :slug', { slug: query.slug });
    }

    if (query.completed_after) {
      builder.andWhere('submitter.completed_at >= :completedAfter', {
        completedAfter: new Date(query.completed_after),
      });
    }

    if (query.completed_before) {
      builder.andWhere('submitter.completed_at <= :completedBefore', {
        completedBefore: new Date(query.completed_before),
      });
    }

    const externalId = query.application_key ?? query.external_id;

    if (externalId) {
      builder.andWhere('submitter.external_id = :externalId', { externalId });
    }

    if (query.template_id) {
      builder.andWhere('submission.template_id = :templateId', {
        templateId: query.template_id,
      });
    }

    if (query.after) {
      builder.andWhere('submitter.id < :after', { after: query.after });
    }

    if (query.before) {
      builder.andWhere('submitter.id >= :before', {
        before: String(Number(query.before) + 1),
      });
    }
  }

  private async findAccountSubmitterOrFail(
    user: User,
    submitterId: string,
  ): Promise<Submitter> {
    try {
      return await this.submitters.findOneOrFail({
        where: {
          id: submitterId,
          accountId: user.accountId,
        },
        relations: {
          submission: {
            template: true,
          },
          submissionEvents: true,
        },
        order: {
          submissionEvents: {
            id: 'ASC',
          },
        },
      });
    } catch (error) {
      throwIfNotFound(error, 'Submitter not found');
    }
  }

  private assignSubmitterAttributes(
    submitter: Submitter,
    input: UpdateSubmitterDto,
  ): void {
    if (Object.prototype.hasOwnProperty.call(input, 'email')) {
      submitter.email = normalizeEmail(input.email);
    }

    if (Object.prototype.hasOwnProperty.call(input, 'name')) {
      submitter.name = input.name ?? null;
    }

    const phoneFieldUuid = this.findPhoneValueFieldUuid(submitter, input);

    if (Object.prototype.hasOwnProperty.call(input, 'phone')) {
      submitter.phone = normalizePhone(input.phone);
    } else if (phoneFieldUuid && input.values?.[phoneFieldUuid]) {
      submitter.phone = normalizePhone(input.values[phoneFieldUuid]);
    }

    if (input.values) {
      const values = { ...input.values };

      if (phoneFieldUuid) {
        delete values[phoneFieldUuid];
      }

      submitter.values = {
        ...(submitter.values ?? {}),
        ...values,
      };
    }

    if (Object.prototype.hasOwnProperty.call(input, 'metadata')) {
      submitter.metadata = input.metadata ?? {};
    }

    if (Object.prototype.hasOwnProperty.call(input, 'application_key')) {
      submitter.externalId = input.application_key ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(input, 'external_id')) {
      submitter.externalId = input.external_id ?? null;
    }

    this.assignPreferences(submitter, input);
  }

  private assignPreferences(
    submitter: Submitter,
    input: UpdateSubmitterDto,
  ): void {
    const preferences: Record<string, unknown> = {
      ...(submitter.preferences ?? {}),
    };

    if (input.values) {
      preferences.default_values = input.values;
    }

    for (const key of [
      'send_email',
      'send_sms',
      'reply_to',
      'require_phone_2fa',
      'require_email_2fa',
      'go_to_last',
      'completed_redirect_url',
    ] as const) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        preferences[key] = input[key];
      }
    }

    if (input.message) {
      preferences.message = input.message;
      if (input.message.subject) {
        preferences.request_email_subject = input.message.subject;
      }
      if (input.message.body) {
        preferences.request_email_body = input.message.body;
      }
    }

    submitter.preferences = preferences;
  }

  private assignSubmissionFieldOverrides(
    submitter: Submitter,
    input: UpdateSubmitterDto,
  ): void {
    if (
      !input.values &&
      !input.fields?.length &&
      !input.readonly_fields?.length
    ) {
      return;
    }

    const submission = submitter.submission;
    submission.templateFields ??= structuredClone(
      submission.template?.fields ?? [],
    );
    submission.templateSchema ??= structuredClone(
      submission.template?.schema ?? [],
    );

    const fields = submission.templateFields;

    this.applyReadonlyFields(fields, submitter.uuid, input.readonly_fields);
    this.applyFieldValues(fields, submitter.uuid, input.values);
    this.applyFieldConfigs(fields, submitter.uuid, input.fields);
  }

  private applyReadonlyFields(
    fields: TemplateField[],
    submitterUuid: string,
    readonlyFields?: string[],
  ): void {
    if (!readonlyFields?.length) {
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
    submitterUuid: string,
    values?: Record<string, unknown>,
  ): void {
    if (!values) {
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
    submitterUuid: string,
    configs?: TemplateField[],
  ): void {
    if (!configs?.length) {
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

  private mergeFieldDefaultValues(
    submitter: Submitter,
  ): Record<string, unknown> {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];
    const values = { ...(submitter.values ?? {}) };

    for (const field of fields) {
      if (
        field.submitter_uuid === submitter.uuid &&
        field.uuid &&
        !Object.prototype.hasOwnProperty.call(values, field.uuid) &&
        Object.prototype.hasOwnProperty.call(field, 'default_value')
      ) {
        values[field.uuid] = field.default_value;
      }
    }

    return values;
  }

  private prepareCompletedValues(
    submitter: Submitter,
  ): Record<string, unknown> {
    return this.replaceCurrentDatePlaceholders(
      this.removeConditionHiddenValues(
        this.mergeFieldDefaultValues(submitter),
        submitter,
      ),
      submitter,
    );
  }

  private removeConditionHiddenValues(
    values: Record<string, unknown>,
    submitter: Submitter,
  ): Record<string, unknown> {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];
    const nextValues = { ...values };

    for (const field of fields) {
      if (!field.uuid || field.submitter_uuid !== submitter.uuid) {
        continue;
      }

      const conditions = Array.isArray(field.conditions)
        ? field.conditions.filter(isFieldCondition)
        : [];

      if (
        conditions.some(
          (condition) =>
            condition.action === 'hide' &&
            isConditionSatisfied(condition, values),
        )
      ) {
        delete nextValues[field.uuid];
      }
    }

    return nextValues;
  }

  private replaceCurrentDatePlaceholders(
    values: Record<string, unknown>,
    submitter: Submitter,
  ): Record<string, unknown> {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];
    const nextValues = { ...values };
    const today = new Date().toISOString().slice(0, 10);

    for (const field of fields) {
      if (
        field.uuid &&
        field.type === 'date' &&
        field.submitter_uuid === submitter.uuid &&
        isCurrentDatePlaceholder(nextValues[field.uuid])
      ) {
        nextValues[field.uuid] = today;
      }
    }

    return nextValues;
  }

  private findPhoneValueFieldUuid(
    submitter: Submitter,
    input: UpdateSubmitterDto,
  ): string | null {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];

    return (
      fields.find(
        (field) =>
          field.type === 'phone' &&
          field.uuid &&
          input.values?.[field.uuid] &&
          field.submitter_uuid === submitter.uuid,
      )?.uuid ?? null
    );
  }

  private async toSubmitterResponse(
    submitter: Submitter,
    options: SerializeSubmitterOptions,
  ): Promise<SubmitterResponseDto> {
    const preferences = { ...(submitter.preferences ?? {}) };
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
      status: this.buildSubmitterStatus(submitter),
      external_id: submitter.externalId,
      application_key: submitter.externalId,
      metadata: submitter.metadata ?? {},
      preferences,
      ...(options.includeTemplate && submitter.submission.template
        ? {
            template: {
              id: submitter.submission.template.id,
              name: submitter.submission.template.name,
              created_at: submitter.submission.template.createdAt,
              updated_at: submitter.submission.template.updatedAt,
            },
          }
        : {}),
      ...(options.includeEvents
        ? {
            submission_events: this.serializeEvents(
              submitter.submissionEvents ?? [],
            ),
          }
        : {}),
      values: options.includeValues
        ? this.serializeSubmitterValues(submitter)
        : [],
      documents: options.includeDocuments
        ? await this.serializeSubmitterDocuments(submitter)
        : [],
      role: this.findSubmitterRole(submitter),
      ...(options.includeUrls
        ? { embed_src: this.buildSubmitterEmbedUrl(submitter) }
        : {}),
      ...(options.includeFields
        ? {
            fields: this.serializeSubmitterFields(submitter),
          }
        : {}),
    };
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

  private findSubmitterRole(submitter: Submitter): string {
    const templateSubmitters =
      submitter.submission.templateSubmitters ??
      submitter.submission.template?.submitters ??
      [];

    return (
      templateSubmitters.find((item) => item.uuid === submitter.uuid)?.name ??
      ''
    );
  }

  private serializeSubmitterValues(
    submitter: Submitter,
  ): { field: string; value: unknown }[] {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];

    return Object.entries(submitter.values ?? {}).map(([fieldUuid, value]) => ({
      field:
        fields.find((field) => field.uuid === fieldUuid)?.name ?? fieldUuid,
      value,
    }));
  }

  private serializeSubmitterFields(submitter: Submitter): TemplateField[] {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];

    return fields.filter((field) => field.submitter_uuid === submitter.uuid);
  }

  private serializeEvents(
    events: SubmissionEvent[],
  ): SubmitterEventResponseDto[] {
    return events.map((event) => ({
      id: event.id,
      submitter_id: event.submitterId,
      event_type: event.eventType,
      event_timestamp: event.eventTimestamp,
      data: pickEventData(event.data),
    }));
  }

  private async serializeSubmitterDocuments(
    submitter: Submitter,
  ): Promise<SubmitterDocumentResponseDto[]> {
    if (submitter.completedAt) {
      const documents = await this.storageService.findRecordAttachments({
        recordType: 'Submitter',
        recordId: submitter.id,
        name: 'documents',
      });

      if (documents.length > 0) {
        return documents.map((attachment) => ({
          name: getBaseName(attachment.blob.filename),
          url: this.storageService.createBlobProxyUrl(attachment.blob),
        }));
      }
    }

    const templateId =
      submitter.submission.templateId ?? submitter.submission.template?.id;

    if (!templateId) {
      return [];
    }

    const attachments = await this.storageService.findRecordAttachments({
      recordType: 'Template',
      recordId: templateId,
      name: 'documents',
    });
    const schema =
      submitter.submission.templateSchema ??
      submitter.submission.template?.schema ??
      [];

    return attachments.map((attachment) => ({
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

  private includes(value: string | undefined, key: string): boolean {
    return (
      value
        ?.split(',')
        .map((item) => item.trim())
        .includes(key) ?? false
    );
  }
}

type SerializeSubmitterOptions = {
  includeTemplate: boolean;
  includeEvents: boolean;
  includeDocuments: boolean;
  includeValues: boolean;
  includeUrls: boolean;
  includeFields: boolean;
};

function normalizeEmail(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  return String(value).replace(/[^0-9+]/g, '') || null;
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replaceAll(' ', '_');
}

type FieldCondition = {
  action?: string;
  field_uuid?: string;
  operation?: string;
  value?: unknown;
};

function isFieldCondition(value: unknown): value is FieldCondition {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isConditionSatisfied(
  condition: FieldCondition,
  values: Record<string, unknown>,
): boolean {
  if (!condition.field_uuid) {
    return false;
  }

  const actual = values[condition.field_uuid];
  const expected = condition.value;
  const operation = condition.operation ?? 'equals';
  const actualString = valueToString(actual);
  const expectedString = valueToString(expected);

  if (operation === 'not_equals') {
    return actualString !== expectedString;
  }

  if (operation === 'contains') {
    return actualString.includes(expectedString);
  }

  if (operation === 'not_contains') {
    return !actualString.includes(expectedString);
  }

  return actualString === expectedString;
}

function isCurrentDatePlaceholder(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['current_date', '{{current_date}}', '{current_date}', 'today'].includes(
      value.trim().toLowerCase(),
    )
  );
}

function valueToString(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
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

function pickEventData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data ?? {}).filter(([key]) =>
      [
        'reason',
        'firstname',
        'lastname',
        'method',
        'country',
        'idcode',
      ].includes(key),
    ),
  );
}
