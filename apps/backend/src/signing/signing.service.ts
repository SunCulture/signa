import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { DataSource, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageService } from '../storage/storage.service';
import { UploadedBufferFile } from '../storage/storage.types';
import { SubmissionEvent } from '../submissions/entities/submission-event.entity';
import { Submission } from '../submissions/entities/submission.entity';
import {
  TemplateField,
  TemplateSchemaItem,
} from '../templates/types/template-json';
import { Submitter } from '../submitters/entities/submitter.entity';
import {
  DeclineSigningDto,
  UpdateSigningValuesDto,
} from './dto/signing-request.dto';
import {
  SigningAttachmentDto,
  SigningDocumentDto,
  SigningDownloadResponseDto,
  SigningFieldValueResponseDto,
  SigningResponseDto,
} from './dto/signing-response.dto';

@Injectable()
export class SigningService {
  constructor(
    @InjectRepository(Submitter)
    private readonly submitters: Repository<Submitter>,
    private readonly dataSource: DataSource,
    private readonly storageService: StorageService,
  ) {}

  async getSigningForm(slug: string): Promise<SigningResponseDto> {
    const submitter = await this.findSubmitterBySlugOrFail(slug);

    await this.markOpened(submitter);

    return this.toSigningResponse(submitter);
  }

  async uploadAttachment(
    slug: string,
    file: UploadedBufferFile,
    type: string | undefined,
  ): Promise<SigningAttachmentDto> {
    const submitter = await this.findSubmitterBySlugOrFail(slug);
    this.assertCanUpdate(submitter);

    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException({
        error: 'Attachment file is required',
      });
    }

    if (type === 'signature' || type === 'initials') {
      await this.assertSignatureImage(file.buffer, type);
    }

    const attachment = await this.storageService.createAttachment({
      buffer: file.buffer,
      filename: file.originalname || `${type || 'attachment'}.png`,
      contentType: file.mimetype ?? 'application/octet-stream',
      name: 'attachments',
      recordType: 'Submitter',
      recordId: submitter.id,
      metadata: {
        analyzed: true,
        identified: true,
        signing_type: type ?? 'attachment',
      },
    });

    return this.toAttachmentResponse(attachment);
  }

  async getFieldValue(
    slug: string,
    fieldUuid: string,
    after?: string,
  ): Promise<SigningFieldValueResponseDto> {
    const submitter = await this.findSubmitterBySlugOrFail(slug);
    const value = submitter.values?.[fieldUuid] ?? null;
    const attachments = await this.serializeSubmitterAttachments(submitter);
    const afterDate = parseDate(after);
    const attachment =
      typeof value === 'string'
        ? await this.findSubmitterAttachmentByUuid(submitter, value, afterDate)
        : null;

    return {
      value,
      attachment:
        attachment ??
        attachments.find((candidate) => candidate.uuid === value) ??
        null,
    };
  }

  async updateValues(
    slug: string,
    input: UpdateSigningValuesDto,
  ): Promise<SigningResponseDto> {
    const submitter = await this.findSubmitterBySlugOrFail(slug);
    this.assertCanUpdate(submitter);

    submitter.values = {
      ...(submitter.values ?? {}),
      ...input.values,
    };

    if (input.completed) {
      this.assertRequiredFieldsComplete(submitter);
      submitter.completedAt = new Date();
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Submitter).save(submitter);

      if (input.completed) {
        await manager.getRepository(SubmissionEvent).save(
          manager.getRepository(SubmissionEvent).create({
            accountId: submitter.accountId,
            submissionId: submitter.submissionId,
            submitterId: submitter.id,
            eventType: 'complete_form',
            eventTimestamp: new Date(),
            data: {},
          }),
        );
      }
    });

    return this.toSigningResponse(submitter);
  }

  async decline(
    slug: string,
    input: DeclineSigningDto,
  ): Promise<SigningResponseDto> {
    const submitter = await this.findSubmitterBySlugOrFail(slug);
    this.assertCanUpdate(submitter);

    submitter.declinedAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Submitter).save(submitter);
      await manager.getRepository(SubmissionEvent).save(
        manager.getRepository(SubmissionEvent).create({
          accountId: submitter.accountId,
          submissionId: submitter.submissionId,
          submitterId: submitter.id,
          eventType: 'decline_form',
          eventTimestamp: new Date(),
          data: { reason: input.reason ?? '' },
        }),
      );
    });

    return this.toSigningResponse(submitter);
  }

  async getDownload(slug: string): Promise<SigningDownloadResponseDto> {
    const submitter = await this.findSubmitterBySlugOrFail(slug);

    return {
      documents: await this.serializeDocuments(submitter.submission),
    };
  }

  private async findSubmitterBySlugOrFail(slug: string): Promise<Submitter> {
    const submitter = await this.submitters.findOne({
      where: { slug },
      relations: {
        submission: {
          template: true,
          submitters: true,
        },
      },
    });

    if (!submitter) {
      throw new NotFoundException({ error: 'Signing form not found' });
    }

    return submitter;
  }

  private async markOpened(submitter: Submitter): Promise<void> {
    if (submitter.openedAt) {
      return;
    }

    submitter.openedAt = new Date();

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Submitter).save(submitter);
      await manager.getRepository(SubmissionEvent).save(
        manager.getRepository(SubmissionEvent).create({
          accountId: submitter.accountId,
          submissionId: submitter.submissionId,
          submitterId: submitter.id,
          eventType: 'view_form',
          eventTimestamp: new Date(),
          data: {},
        }),
      );
    });
  }

  private assertCanUpdate(submitter: Submitter): void {
    if (submitter.completedAt) {
      throw new UnprocessableEntityException({
        error: 'Form has been completed already',
      });
    }

    if (submitter.declinedAt) {
      throw new UnprocessableEntityException({
        error: 'Form has been declined',
      });
    }

    if (
      submitter.submission.archivedAt ||
      submitter.submission.template?.archivedAt
    ) {
      throw new UnprocessableEntityException({
        error: 'Form has been archived',
      });
    }

    if (
      submitter.submission.expireAt &&
      submitter.submission.expireAt < new Date()
    ) {
      throw new UnprocessableEntityException({
        error: 'Form has been expired',
      });
    }
  }

  private async assertSignatureImage(
    buffer: Buffer,
    type: string,
  ): Promise<void> {
    const image = sharp(buffer);
    const stats = await image.stats();
    const metadata = await image.metadata();
    const hasInk = stats.channels.some((channel) => channel.stdev > 1);

    if (!metadata.width || !metadata.height || !hasInk) {
      throw new UnprocessableEntityException({
        error: `${type} is empty`,
      });
    }
  }

  private assertRequiredFieldsComplete(submitter: Submitter): void {
    const missingField = this.getSubmitterFields(submitter).find((field) => {
      if (field.required === false || field.readonly === true || !field.uuid) {
        return false;
      }

      return isBlankValue(submitter.values?.[field.uuid]);
    });

    if (missingField?.uuid) {
      throw new UnprocessableEntityException({
        field_uuid: missingField.uuid,
        error: 'Fill all required fields to complete',
      });
    }
  }

  private async toSigningResponse(
    submitter: Submitter,
  ): Promise<SigningResponseDto> {
    const submission = submitter.submission;

    return {
      submission_id: submission.id,
      title: submission.name ?? submission.template?.name ?? 'Document',
      submitter: {
        id: submitter.id,
        slug: submitter.slug,
        uuid: submitter.uuid,
        name: submitter.name,
        email: submitter.email,
        role: this.findSubmitterRole(submitter),
        completed_at: submitter.completedAt,
        declined_at: submitter.declinedAt,
      },
      documents: await this.serializeDocuments(submission),
      fields: this.getSubmitterFields(submitter),
      values: submitter.values ?? {},
      readonly_values: this.getReadonlyValues(submitter),
      attachments: await this.serializeSubmitterAttachments(submitter),
    };
  }

  private async serializeDocuments(
    submission: Submission,
  ): Promise<SigningDocumentDto[]> {
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
      orderedAttachments.map(async (attachment) => ({
        id: attachment.id,
        uuid: attachment.uuid,
        filename: attachment.blob.filename,
        name:
          getSchemaDocumentName(schema, attachment.uuid) ??
          attachment.blob.filename,
        url: this.storageService.createBlobProxyUrl(attachment.blob, 3600),
        preview_images: await this.serializePreviewImages(attachment),
      })),
    );
  }

  private async serializePreviewImages(
    document: StorageAttachment,
  ): Promise<SigningDocumentDto['preview_images']> {
    const previews = await this.storageService.findPreviewAttachments(
      document.id,
    );

    return previews.map((preview) => ({
      id: preview.id,
      url: this.storageService.createBlobProxyUrl(preview.blob, 3600),
      filename: preview.blob.filename,
      metadata: preview.blob.metadata ?? {},
    }));
  }

  private toAttachmentResponse(
    attachment: StorageAttachment,
  ): SigningAttachmentDto {
    return {
      uuid: attachment.uuid,
      filename: attachment.blob.filename,
      content_type: attachment.blob.contentType,
      url: this.storageService.createBlobProxyUrl(attachment.blob, 3600),
    };
  }

  private async serializeSubmitterAttachments(
    submitter: Submitter,
  ): Promise<SigningAttachmentDto[]> {
    const attachments = await this.storageService.findRecordAttachments({
      recordType: 'Submitter',
      recordId: submitter.id,
      name: 'attachments',
    });

    return attachments.map((attachment) =>
      this.toAttachmentResponse(attachment),
    );
  }

  private async findSubmitterAttachmentByUuid(
    submitter: Submitter,
    uuid: string,
    afterDate: Date | null,
  ): Promise<SigningAttachmentDto | null> {
    const attachments = await this.storageService.findRecordAttachments({
      recordType: 'Submitter',
      recordId: submitter.id,
      name: 'attachments',
    });
    const attachment = attachments.find(
      (candidate) =>
        candidate.uuid === uuid &&
        (!afterDate || candidate.createdAt > afterDate),
    );

    return attachment ? this.toAttachmentResponse(attachment) : null;
  }

  private getSubmitterFields(submitter: Submitter): TemplateField[] {
    const fields =
      submitter.submission.templateFields ??
      submitter.submission.template?.fields ??
      [];

    return fields.filter((field) => field.submitter_uuid === submitter.uuid);
  }

  private getReadonlyValues(submitter: Submitter): Record<string, unknown> {
    return Object.fromEntries(
      (submitter.submission.submitters ?? [])
        .filter((item) => item.uuid !== submitter.uuid)
        .flatMap((item) => Object.entries(item.values ?? {})),
    );
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
}

function getSchemaDocumentName(
  schema: TemplateSchemaItem[],
  attachmentUuid: string,
): string | null {
  const name = schema.find(
    (item) => item.attachment_uuid === attachmentUuid,
  )?.name;

  return typeof name === 'string' ? name : null;
}

function getSchemaOrderedAttachments(
  schema: TemplateSchemaItem[],
  attachments: StorageAttachment[],
): StorageAttachment[] {
  const attachmentsByUuid = new Map(
    attachments.map((attachment) => [attachment.uuid, attachment]),
  );

  return schema
    .map((item) => item.attachment_uuid)
    .filter((uuid): uuid is string => typeof uuid === 'string')
    .map((uuid) => attachmentsByUuid.get(uuid))
    .filter((attachment) => attachment !== undefined);
}

function isBlankValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? null : date;
}
