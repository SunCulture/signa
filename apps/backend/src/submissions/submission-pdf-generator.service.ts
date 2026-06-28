import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import sharp from 'sharp';
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
    signatureMetadataByUuid?: Map<string, SignatureMetadata>;
    options?: PdfResultOptions;
  }): Promise<Buffer> {
    const source = await this.storageService.readBlob(input.document.blob);
    const pdf = await PDFDocument.load(source, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

    const options = input.options ?? {
      flatten: true,
      withSignatureId: false,
    };

    if (options.flatten !== false) {
      flattenSourceForm(pdf);
    }

    if (options.withSignatureId && options.documentId) {
      drawDocumentId(pdf, options.documentId, font);
    }

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
            font,
            field.type ?? 'image',
            value,
            getSigningReasonValue(field, input.values),
            input.attachmentsByUuid,
            input.signatureMetadataByUuid ??
              new Map<string, SignatureMetadata>(),
            options,
          );
        } else if (field.type === 'checkbox') {
          drawCheckbox(page, box, Boolean(value), boldFont);
        } else {
          drawTextValue(page, box, stringifyValue(value), font);
        }
      }
    }

    return Buffer.from(await saveCompatiblePdf(pdf));
  }

  async mergePdfAttachments(attachments: StorageAttachment[]): Promise<Buffer> {
    const merged = await PDFDocument.create();

    for (const attachment of attachments) {
      const data = await this.storageService.readBlob(attachment.blob);
      const source = await PDFDocument.load(data, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      const pages = await merged.copyPages(source, source.getPageIndices());

      pages.forEach((page) => merged.addPage(page));
    }

    return Buffer.from(await saveCompatiblePdf(merged));
  }

  async buildAuditTrail(
    submission: Submission,
    documents: AuditTrailDocument[] = [],
  ): Promise<Buffer> {
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

    if (documents.length > 0) {
      y -= 12;
      page.drawText('Documents', { x: 48, y, size: 14, font: boldFont });
      y -= 22;

      for (const document of documents) {
        if (y < 96) {
          break;
        }

        page.drawText(document.filename, {
          x: 48,
          y,
          size: 10,
          font: boldFont,
        });
        y -= 14;
        page.drawText(`Original SHA-256: ${document.originalSha256 ?? 'n/a'}`, {
          x: 56,
          y,
          size: 7,
          font,
          maxWidth: 500,
        });
        y -= 12;
        page.drawText(`Result SHA-256: ${document.resultSha256 ?? 'n/a'}`, {
          x: 56,
          y,
          size: 7,
          font,
          maxWidth: 500,
        });
        y -= 18;
      }
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

    return Buffer.from(await saveCompatiblePdf(pdf));
  }

  private async drawImageValue(
    pdf: PDFDocument,
    page: PDFPage,
    box: PdfBox,
    font: PDFFont,
    fieldType: string,
    value: unknown,
    reason: string | null,
    attachmentsByUuid: Map<string, StorageAttachment>,
    signatureMetadataByUuid: Map<string, SignatureMetadata>,
    options: PdfResultOptions,
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
    const normalized = await normalizeImageForPdf(imageBuffer, {
      fieldType,
      maxHeight: box.height,
      maxWidth: box.width,
    });
    const image =
      normalized.contentType === 'image/jpeg'
        ? await pdf.embedJpg(normalized.buffer)
        : await pdf.embedPng(normalized.buffer);
    const needsSignatureMetadata =
      options.withSignatureId &&
      (fieldType === 'signature' || fieldType === 'initials');
    const metadata = signatureMetadataByUuid.get(attachment.uuid);

    if (needsSignatureMetadata && box.width / Math.max(box.height, 1) > 4.5) {
      const imageBox = { ...box, width: box.width / 2 };
      const textBox = {
        ...box,
        x: box.x + box.width / 2,
        width: box.width / 2,
      };

      drawSignatureImage(page, image, imageBox, {
        alignBottom: isTypedSignatureAttachment(attachment),
      });
      drawSignatureMetadata(
        page,
        textBox,
        attachment.uuid,
        reason,
        metadata,
        font,
      );
      return;
    }

    const metadataHeight = needsSignatureMetadata
      ? Math.min(box.height * 0.42, 24)
      : 0;
    const imageBox = {
      ...box,
      height: Math.max(1, box.height - metadataHeight),
      y: box.y + metadataHeight,
    };

    drawSignatureImage(page, image, imageBox, {
      alignBottom:
        isTypedSignatureAttachment(attachment) || !needsSignatureMetadata,
    });

    if (needsSignatureMetadata) {
      drawSignatureMetadata(page, box, attachment.uuid, reason, metadata, font);
    }
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

type PdfResultOptions = {
  documentId?: string;
  flatten: boolean;
  withSignatureId: boolean;
};

type SignatureMetadata = {
  signedAt: Date;
  signerEmail: string | null;
  signerName: string | null;
};

export type AuditTrailDocument = {
  filename: string;
  originalSha256: string | null;
  resultSha256: string | null;
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

function drawDocumentId(
  pdf: PDFDocument,
  documentId: string,
  font: PDFFont,
): void {
  for (const page of pdf.getPages()) {
    page.drawText(`Document ID: ${documentId}`, {
      x: 8,
      y: page.getHeight() - 11,
      size: 6,
      font,
      color: rgb(0.02, 0.08, 0.16),
    });
  }
}

function drawSignatureImage(
  page: PDFPage,
  image: PDFImage,
  box: PdfBox,
  options: { alignBottom: boolean },
): void {
  const scaled = image.scaleToFit(box.width, box.height);

  page.drawImage(image, {
    x: box.x + (box.width - scaled.width) / 2,
    y: options.alignBottom
      ? box.y
      : box.y + Math.max(0, (box.height - scaled.height) / 2),
    width: scaled.width,
    height: scaled.height,
  });
}

function drawSignatureMetadata(
  page: PDFPage,
  box: PdfBox,
  attachmentUuid: string,
  reason: string | null,
  metadata: SignatureMetadata | undefined,
  font: PDFFont,
): void {
  const baseSize = Math.max(2.8, Math.min(5.2, box.height * 0.11));
  const maxWidth = Math.max(1, box.width - 4);
  const signer = [metadata?.signerName, metadata?.signerEmail]
    .filter(Boolean)
    .join(' ');
  const signedBy = reason
    ? `Reason: ${reason}${signer ? ` ${signer}` : ''}`
    : `Digitally signed by ${signer || 'signer'}`;
  const lines = [
    `ID: ${attachmentUuid.toUpperCase()}`,
    signedBy,
    metadata?.signedAt ? formatSignatureDate(metadata.signedAt) : '',
  ]
    .filter(Boolean)
    .map((text) => ({
      size: fitTextSize(font, text, baseSize, maxWidth),
      text,
    }));

  const lineGap = 1;
  const totalHeight =
    lines.reduce((sum, line) => sum + line.size, 0) +
    Math.max(0, lines.length - 1) * lineGap;
  let y = box.y + 1 + totalHeight;

  for (const line of lines) {
    y -= line.size;

    page.drawText(line.text, {
      x: box.x + 2,
      y,
      size: line.size,
      font,
      color: rgb(0.02, 0.08, 0.16),
    });

    y -= lineGap;
  }
}

function fitTextSize(
  font: PDFFont,
  text: string,
  preferredSize: number,
  maxWidth: number,
): number {
  const width = font.widthOfTextAtSize(text, preferredSize);

  if (width <= maxWidth) {
    return preferredSize;
  }

  return Math.max(2.4, (preferredSize * maxWidth) / Math.max(width, 1));
}

function formatSignatureDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    month: 'long',
    timeZoneName: 'short',
    year: 'numeric',
  }).format(value);
}

function isTypedSignatureAttachment(attachment: StorageAttachment): boolean {
  return attachment.blob.filename === 'typed-signature.png';
}

function getSigningReasonValue(
  field: TemplateField,
  values: Record<string, unknown>,
): string | null {
  if (!field.uuid) {
    return null;
  }

  const value = values[`${field.uuid}_reason`];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function flattenSourceForm(pdf: PDFDocument): void {
  try {
    pdf.getForm().flatten({ updateFieldAppearances: true });
  } catch {
    // Some source PDFs have malformed AcroForm dictionaries. DocuSeal also
    // treats flattening as best-effort before drawing result values.
  }
}

async function normalizeImageForPdf(
  buffer: Buffer,
  options: { fieldType: string; maxHeight: number; maxWidth: number },
): Promise<{ buffer: Buffer; contentType: 'image/jpeg' | 'image/png' }> {
  const targetWidth = Math.max(1, Math.ceil(options.maxWidth * 4));
  const targetHeight = Math.max(1, Math.ceil(options.maxHeight * 4));
  const image = sharp(buffer, { animated: false, failOn: 'none' })
    .rotate()
    .resize({
      fit: 'inside',
      height: targetHeight,
      width: targetWidth,
      withoutEnlargement: false,
    })
    .toColorspace('srgb');

  if (options.fieldType === 'image') {
    const metadata = await image.metadata();

    if (!metadata.hasAlpha) {
      return {
        buffer: await image.jpeg({ mozjpeg: true, quality: 92 }).toBuffer(),
        contentType: 'image/jpeg',
      };
    }
  }

  return {
    buffer: await image.png({ compressionLevel: 9 }).toBuffer(),
    contentType: 'image/png',
  };
}

async function saveCompatiblePdf(pdf: PDFDocument): Promise<Uint8Array> {
  return pdf.save({
    addDefaultPage: false,
    objectsPerTick: 50,
    updateFieldAppearances: false,
    useObjectStreams: false,
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
