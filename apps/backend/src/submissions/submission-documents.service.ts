import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageService } from '../storage/storage.service';
import { Submitter } from '../submitters/entities/submitter.entity';
import {
  TemplateField,
  TemplateSchemaItem,
} from '../templates/types/template-json';
import { CompletedDocument } from './entities/completed-document.entity';
import { CompletedSubmitter } from './entities/completed-submitter.entity';
import { DocumentGenerationEvent } from './entities/document-generation-event.entity';
import { Submission } from './entities/submission.entity';
import {
  SourceDocument,
  SubmissionPdfGeneratorService,
} from './submission-pdf-generator.service';

@Injectable()
export class SubmissionDocumentsService {
  constructor(
    @InjectRepository(CompletedDocument)
    private readonly completedDocuments: Repository<CompletedDocument>,
    @InjectRepository(CompletedSubmitter)
    private readonly completedSubmitters: Repository<CompletedSubmitter>,
    @InjectRepository(DocumentGenerationEvent)
    private readonly generationEvents: Repository<DocumentGenerationEvent>,
    private readonly storageService: StorageService,
    private readonly pdfGenerator: SubmissionPdfGeneratorService,
  ) {}

  async getSubmissionDocuments(
    submission: Submission,
    options: { merge?: boolean } = {},
  ): Promise<StorageAttachment[]> {
    if (this.isSubmissionCompleted(submission)) {
      const lastSubmitter = this.getLastCompletedSubmitter(submission);

      if (!lastSubmitter) {
        return [];
      }

      return options.merge
        ? [
            await this.ensureMergedDocument(lastSubmitter, {
              submission,
              withAudit: false,
            }),
          ]
        : this.ensureResultDocuments(lastSubmitter, submission);
    }

    return options.merge
      ? [await this.ensurePreviewMergedDocument(submission)]
      : this.ensurePreviewDocuments(submission);
  }

  async getAuditTrailUrl(submission: Submission): Promise<string | null> {
    if (!this.isSubmissionCompleted(submission)) {
      return null;
    }

    const auditTrail = await this.ensureAuditTrail(submission);

    return this.storageService.createBlobProxyUrl(auditTrail.blob, 3600);
  }

  async getCombinedDocumentUrl(submission: Submission): Promise<string | null> {
    if (!this.isSubmissionCompleted(submission)) {
      return null;
    }

    const lastSubmitter = this.getLastCompletedSubmitter(submission);

    if (!lastSubmitter) {
      return null;
    }

    const combined = await this.ensureMergedDocument(lastSubmitter, {
      submission,
      withAudit: true,
    });

    return this.storageService.createBlobProxyUrl(combined.blob, 3600);
  }

  async processSubmitterCompletion(submitter: Submitter): Promise<void> {
    await this.recordGenerationEvent(submitter.id, 'start');
    await this.ensureCompletedSubmitter(submitter);
    const resultDocuments = await this.ensureResultDocuments(
      submitter,
      submitter.submission,
    );

    await this.recordCompletedDocumentChecksums(submitter, resultDocuments);

    if (this.isSubmissionCompleted(submitter.submission)) {
      await this.ensureAuditTrail(submitter.submission);
    }

    await this.recordGenerationEvent(submitter.id, 'complete');
  }

  async ensureResultDocuments(
    submitter: Submitter,
    submission = submitter.submission,
  ): Promise<StorageAttachment[]> {
    const existing = await this.storageService.findRecordAttachments({
      recordType: 'Submitter',
      recordId: submitter.id,
      name: 'documents',
    });

    if (existing.length > 0) {
      return existing;
    }

    const documents = await this.getSourceDocuments(submission);
    const fields = this.getSubmissionFields(submission);
    const values = this.buildSubmissionValues(submission);
    const attachmentsByUuid = await this.getSubmitterAttachmentsByUuid(
      submission.submitters ?? [submitter],
    );

    const generated: StorageAttachment[] = [];

    for (const document of documents) {
      const pdf = await this.pdfGenerator.stampPdfDocument({
        document,
        fields,
        values,
        attachmentsByUuid,
      });

      generated.push(
        await this.storageService.createPdfAttachment({
          buffer: pdf,
          filename: document.filename,
          name: 'documents',
          recordType: 'Submitter',
          recordId: submitter.id,
        }),
      );
    }

    return generated;
  }

  async ensurePreviewDocuments(
    submission: Submission,
  ): Promise<StorageAttachment[]> {
    const valuesHash = this.buildValuesHash(submission);
    const existing = await this.storageService.findRecordAttachments({
      recordType: 'Submission',
      recordId: submission.id,
      name: 'preview_documents',
    });

    if (
      existing.length > 0 &&
      existing.every(
        (attachment) => attachment.blob.metadata?.values_hash === valuesHash,
      )
    ) {
      return existing;
    }

    await this.storageService.deleteRecordAttachments({
      recordType: 'Submission',
      recordId: submission.id,
      name: 'preview_documents',
    });

    const documents = await this.getSourceDocuments(submission);
    const fields = this.getSubmissionFields(submission);
    const values = this.buildSubmissionValues(submission);
    const attachmentsByUuid = await this.getSubmitterAttachmentsByUuid(
      submission.submitters ?? [],
    );

    const generated: StorageAttachment[] = [];

    for (const document of documents) {
      const pdf = await this.pdfGenerator.stampPdfDocument({
        document,
        fields,
        values,
        attachmentsByUuid,
      });

      generated.push(
        await this.storageService.createPdfAttachment({
          buffer: pdf,
          filename: document.filename,
          name: 'preview_documents',
          recordType: 'Submission',
          recordId: submission.id,
          metadata: { values_hash: valuesHash },
        }),
      );
    }

    return generated;
  }

  async ensurePreviewMergedDocument(
    submission: Submission,
  ): Promise<StorageAttachment> {
    const valuesHash = this.buildValuesHash(submission);
    const [existing] = await this.storageService.findRecordAttachments({
      recordType: 'Submission',
      recordId: submission.id,
      name: 'preview_merged_document',
    });

    if (existing?.blob.metadata?.values_hash === valuesHash) {
      return existing;
    }

    await this.storageService.deleteRecordAttachments({
      recordType: 'Submission',
      recordId: submission.id,
      name: 'preview_merged_document',
    });

    const documents = await this.ensurePreviewDocuments(submission);
    const merged = await this.pdfGenerator.mergePdfAttachments(documents);

    return this.storageService.createPdfAttachment({
      buffer: merged,
      filename: `${this.getSubmissionBaseName(submission)}.pdf`,
      name: 'preview_merged_document',
      recordType: 'Submission',
      recordId: submission.id,
      metadata: { values_hash: valuesHash },
    });
  }

  async ensureMergedDocument(
    submitter: Submitter,
    options: { submission?: Submission; withAudit: boolean },
  ): Promise<StorageAttachment> {
    const submission = options.submission ?? submitter.submission;
    const withAudit = options.withAudit;
    const attachmentName = withAudit ? 'combined_document' : 'merged_document';
    const [existing] = await this.storageService.findRecordAttachments({
      recordType: 'Submission',
      recordId: submitter.submissionId,
      name: attachmentName,
    });

    if (existing) {
      return existing;
    }

    const documents = await this.ensureResultDocuments(submitter, submission);
    const attachments = withAudit
      ? [...documents, await this.ensureAuditTrail(submission)]
      : documents;
    const merged = await this.pdfGenerator.mergePdfAttachments(attachments);

    return this.storageService.createPdfAttachment({
      buffer: merged,
      filename: `${this.getSubmissionBaseName(submission)}.pdf`,
      name: attachmentName,
      recordType: 'Submission',
      recordId: submitter.submissionId,
    });
  }

  async ensureAuditTrail(submission: Submission): Promise<StorageAttachment> {
    const [existing] = await this.storageService.findRecordAttachments({
      recordType: 'Submission',
      recordId: submission.id,
      name: 'audit_trail',
    });

    if (existing) {
      return existing;
    }

    const buffer = await this.pdfGenerator.buildAuditTrail(submission);

    return this.storageService.createPdfAttachment({
      buffer,
      filename: `${this.getSubmissionBaseName(submission)}-audit-log.pdf`,
      name: 'audit_trail',
      recordType: 'Submission',
      recordId: submission.id,
    });
  }

  private async ensureCompletedSubmitter(submitter: Submitter): Promise<void> {
    const existing = await this.completedSubmitters.findOne({
      where: { submitterId: submitter.id },
    });

    if (existing || !submitter.completedAt) {
      return;
    }

    const hasFirst = await this.completedSubmitters.exists({
      where: { submissionId: submitter.submissionId, isFirst: true },
    });

    await this.completedSubmitters.save(
      this.completedSubmitters.create({
        accountId: submitter.accountId,
        submissionId: submitter.submissionId,
        submitterId: submitter.id,
        templateId: submitter.submission.templateId,
        completedAt: submitter.completedAt,
        isFirst: !hasFirst,
        smsCount: 0,
        source: submitter.submission.source,
        verificationMethod: null,
      }),
    );
  }

  private async recordCompletedDocumentChecksums(
    submitter: Submitter,
    documents: StorageAttachment[],
  ): Promise<void> {
    for (const document of documents) {
      const sha256 =
        typeof document.blob.metadata?.sha256 === 'string'
          ? document.blob.metadata.sha256
          : null;

      if (!sha256) {
        continue;
      }

      const exists = await this.completedDocuments.exists({
        where: { sha256, submitterId: submitter.id },
      });

      if (!exists) {
        await this.completedDocuments.save(
          this.completedDocuments.create({ sha256, submitterId: submitter.id }),
        );
      }
    }
  }

  private async recordGenerationEvent(
    submitterId: string,
    eventName: DocumentGenerationEvent['eventName'],
  ): Promise<void> {
    const exists = await this.generationEvents.exists({
      where: { submitterId, eventName },
    });

    if (!exists) {
      await this.generationEvents.save(
        this.generationEvents.create({ submitterId, eventName }),
      );
    }
  }

  private async getSourceDocuments(
    submission: Submission,
  ): Promise<SourceDocument[]> {
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

    return getSchemaOrderedAttachments(schema, attachments).map(
      (attachment) => ({
        attachment,
        blob: attachment.blob,
        filename:
          getSchemaDocumentName(schema, attachment.uuid) ??
          attachment.blob.filename,
        uuid: attachment.uuid,
      }),
    );
  }

  private async getSubmitterAttachmentsByUuid(
    submitters: Submitter[],
  ): Promise<Map<string, StorageAttachment>> {
    const attachments = await Promise.all(
      submitters.map((submitter) =>
        this.storageService.findRecordAttachments({
          recordType: 'Submitter',
          recordId: submitter.id,
          name: 'attachments',
        }),
      ),
    );

    return new Map(
      attachments.flat().map((attachment) => [attachment.uuid, attachment]),
    );
  }

  private buildSubmissionValues(
    submission: Submission,
  ): Record<string, unknown> {
    const fields = this.getSubmissionFields(submission);
    const values: Record<string, unknown> = {};

    for (const field of fields) {
      if (field.uuid && field.default_value !== undefined) {
        values[field.uuid] = field.default_value;
      }
    }

    for (const submitter of submission.submitters ?? []) {
      Object.assign(values, submitter.values ?? {});
    }

    return values;
  }

  private buildValuesHash(submission: Submission): string {
    return createHash('sha256')
      .update(JSON.stringify(this.buildSubmissionValues(submission)))
      .digest('base64url');
  }

  private getSubmissionFields(submission: Submission): TemplateField[] {
    return submission.templateFields ?? submission.template?.fields ?? [];
  }

  private isSubmissionCompleted(submission: Submission): boolean {
    const submitters = submission.submitters ?? [];

    return (
      submitters.length > 0 && submitters.every((item) => item.completedAt)
    );
  }

  private getLastCompletedSubmitter(submission: Submission): Submitter | null {
    return (
      [...(submission.submitters ?? [])]
        .filter((submitter) => submitter.completedAt)
        .sort((a, b) => Number(a.completedAt) - Number(b.completedAt))
        .at(-1) ?? null
    );
  }

  private getSubmissionBaseName(submission: Submission): string {
    return sanitizeFilename(
      submission.name ?? submission.template?.name ?? 'document',
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
  const ordered = schema
    .map((item) => item.attachment_uuid)
    .filter((uuid): uuid is string => typeof uuid === 'string')
    .map((uuid) => attachmentsByUuid.get(uuid))
    .filter((attachment) => attachment !== undefined);

  return ordered.length ? ordered : attachments;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
}
