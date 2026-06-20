import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageService } from '../storage/storage.service';
import {
  TemplateField,
  TemplateFieldArea,
} from '../templates/types/template-json';
import { Submission } from './entities/submission.entity';

@Injectable()
export class SubmissionPdfGeneratorService {
  constructor(private readonly storageService: StorageService) {}

  async stampPdfDocument(input: {
    document: SourceDocument;
    fields: TemplateField[];
    values: Record<string, unknown>;
    attachmentsByUuid: Map<string, StorageAttachment>;
  }): Promise<Buffer> {
    const source = await this.storageService.readBlob(input.document.blob);
    const pdf = await PDFDocument.load(source);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    for (const field of input.fields) {
      const value = resolveFieldValue(field, input.values);

      if (isBlankValue(value)) {
        continue;
      }

      for (const area of field.areas ?? []) {
        if (area.attachment_uuid !== input.document.uuid) {
          continue;
        }

        const page = pdf.getPage(Number(area.page ?? 0));
        const box = areaToPdfBox(area, page.getWidth(), page.getHeight());

        if (isImageLikeField(field)) {
          await this.drawImageValue(
            pdf,
            page,
            box,
            value,
            input.attachmentsByUuid,
          );
        } else if (field.type === 'checkbox') {
          drawCheckbox(page, box, Boolean(value), boldFont);
        } else {
          drawTextValue(page, box, stringifyValue(value), font);
        }
      }
    }

    return Buffer.from(await pdf.save());
  }

  async mergePdfAttachments(attachments: StorageAttachment[]): Promise<Buffer> {
    const merged = await PDFDocument.create();

    for (const attachment of attachments) {
      const data = await this.storageService.readBlob(attachment.blob);
      const source = await PDFDocument.load(data);
      const pages = await merged.copyPages(source, source.getPageIndices());

      pages.forEach((page) => merged.addPage(page));
    }

    return Buffer.from(await merged.save());
  }

  async buildAuditTrail(submission: Submission): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([612, 792]);
    const events = [...(submission.submissionEvents ?? [])].sort(
      (a, b) => Number(a.eventTimestamp) - Number(b.eventTimestamp),
    );
    let y = 742;

    page.drawText('Audit Trail', {
      x: 48,
      y,
      size: 22,
      font: boldFont,
      color: rgb(0.08, 0.2, 0.36),
    });
    y -= 34;

    for (const line of buildAuditSummaryLines(submission)) {
      page.drawText(line, { x: 48, y, size: 10, font });
      y -= 18;
    }

    y -= 12;
    page.drawText('Events', { x: 48, y, size: 14, font: boldFont });
    y -= 24;

    for (const event of events) {
      if (y < 64) {
        break;
      }

      page.drawText(
        `${event.eventTimestamp.toISOString()}  ${event.eventType}`,
        { x: 48, y, size: 9, font },
      );
      y -= 14;
    }

    return Buffer.from(await pdf.save());
  }

  private async drawImageValue(
    pdf: PDFDocument,
    page: PDFPage,
    box: PdfBox,
    value: unknown,
    attachmentsByUuid: Map<string, StorageAttachment>,
  ): Promise<void> {
    const attachmentUuid = getFirstArrayValue(value) ?? value;

    if (typeof attachmentUuid !== 'string') {
      return;
    }

    const attachment = attachmentsByUuid.get(attachmentUuid);

    if (!attachment) {
      drawTextValue(
        page,
        box,
        attachmentUuid,
        await pdf.embedFont(StandardFonts.Helvetica),
      );
      return;
    }

    const imageBuffer = await this.storageService.readBlob(attachment.blob);
    const image =
      attachment.blob.contentType === 'image/jpeg'
        ? await pdf.embedJpg(imageBuffer)
        : await pdf.embedPng(imageBuffer);
    const scaled = image.scaleToFit(box.width, box.height);

    page.drawImage(image, {
      x: box.x + (box.width - scaled.width) / 2,
      y: box.y + (box.height - scaled.height) / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }
}

export type SourceDocument = {
  attachment: StorageAttachment;
  blob: StorageAttachment['blob'];
  filename: string;
  uuid: string;
};

type PdfBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function buildAuditSummaryLines(submission: Submission): string[] {
  return [
    `Submission: ${submission.name ?? submission.template?.name ?? submission.id}`,
    `Submission ID: ${submission.id}`,
    `Completed at: ${getLastCompletedAt(submission) ?? ''}`,
    `Document ID: ${createHash('sha256')
      .update(submission.slug)
      .digest('hex')
      .toUpperCase()}`,
  ];
}

function getLastCompletedAt(submission: Submission): string | null {
  return (
    [...(submission.submitters ?? [])]
      .filter((submitter) => submitter.completedAt)
      .sort((a, b) => Number(a.completedAt) - Number(b.completedAt))
      .at(-1)
      ?.completedAt?.toISOString() ?? null
  );
}

function resolveFieldValue(
  field: TemplateField,
  values: Record<string, unknown>,
): unknown {
  if (field.uuid && Object.prototype.hasOwnProperty.call(values, field.uuid)) {
    return values[field.uuid];
  }

  return field.default_value;
}

function areaToPdfBox(
  area: TemplateFieldArea,
  pageWidth: number,
  pageHeight: number,
): PdfBox {
  const x = getFiniteRatio(area.x);
  const y = getFiniteRatio(area.y);
  const w = getFiniteRatio(area.w, 0.16);
  const h = getFiniteRatio(area.h, 0.04);

  return {
    x: x * pageWidth,
    y: pageHeight - (y + h) * pageHeight,
    width: w * pageWidth,
    height: h * pageHeight,
  };
}

function drawTextValue(
  page: PDFPage,
  box: PdfBox,
  value: string,
  font: PDFFont,
): void {
  const fontSize = Math.max(4, Math.min(18, box.height * 0.62));

  page.drawText(value, {
    x: box.x + 2,
    y: box.y + Math.max(1, (box.height - fontSize) / 2),
    size: fontSize,
    font,
    color: rgb(0.02, 0.08, 0.16),
    maxWidth: Math.max(1, box.width - 4),
  });
}

function drawCheckbox(
  page: PDFPage,
  box: PdfBox,
  checked: boolean,
  font: PDFFont,
): void {
  const size = Math.min(box.width, box.height, 14);

  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: size,
    height: size,
    borderColor: rgb(0.08, 0.2, 0.36),
    borderWidth: 1,
  });

  if (checked) {
    page.drawText('X', {
      x: box.x + 1.5,
      y: box.y + 1,
      size,
      font,
      color: rgb(0.08, 0.2, 0.36),
    });
  }
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(stringifyValue).join(', ');
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function isBlankValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isImageLikeField(field: TemplateField): boolean {
  return (
    field.type === 'signature' ||
    field.type === 'initials' ||
    field.type === 'image' ||
    field.type === 'stamp'
  );
}

function getFirstArrayValue(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values: unknown[] = value;

  return values[0];
}

function getFiniteRatio(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numberValue));
}
