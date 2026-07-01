import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { Repository } from 'typeorm';
import { PdfiumProcessingService } from '../pdf-processing/pdfium-processing.service';
import { StorageAttachment } from './entities/storage-attachment.entity';
import { StorageBlob } from './entities/storage-blob.entity';
import { CreateAttachmentInput } from './storage.types';

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(StorageBlob)
    private readonly blobs: Repository<StorageBlob>,
    @InjectRepository(StorageAttachment)
    private readonly attachments: Repository<StorageAttachment>,
    private readonly config: ConfigService,
    private readonly pdfiumProcessing: PdfiumProcessingService,
  ) {}

  async createAttachment(
    input: CreateAttachmentInput,
  ): Promise<StorageAttachment> {
    const key = this.buildStorageKey(input.filename);
    const checksum = createHash('md5').update(input.buffer).digest('base64');
    const blob = await this.blobs.save(
      this.blobs.create({
        key,
        filename: input.filename,
        contentType: input.contentType,
        metadata: input.metadata ?? {},
        serviceName: 'local',
        byteSize: String(input.buffer.byteLength),
        checksum,
      }),
    );

    await this.writeBlobData(blob, input.buffer);

    const attachment = await this.attachments.save(
      this.attachments.create({
        name: input.name,
        recordType: input.recordType,
        recordId: input.recordId,
        blobId: blob.id,
        blob,
        ...(input.uuid ? { uuid: input.uuid } : {}),
      }),
    );

    return attachment;
  }

  async createPdfAttachment(
    input: Omit<CreateAttachmentInput, 'contentType'>,
  ): Promise<StorageAttachment> {
    const metadata = await this.buildPdfMetadata(input.buffer, input.metadata);
    const attachment = await this.createAttachment({
      ...input,
      contentType: 'application/pdf',
      metadata,
    });

    await this.generatePdfPreviewImages(attachment, input.buffer);
    return this.findAttachmentOrFail(attachment.id);
  }

  async cloneAttachment(input: {
    sourceAttachment: StorageAttachment;
    name: string;
    recordType: string;
    recordId: string;
    uuid?: string;
  }): Promise<StorageAttachment> {
    const attachment = await this.attachments.save(
      this.attachments.create({
        name: input.name,
        recordType: input.recordType,
        recordId: input.recordId,
        blobId: input.sourceAttachment.blobId,
        blob: input.sourceAttachment.blob,
        ...(input.uuid ? { uuid: input.uuid } : {}),
      }),
    );

    return this.findAttachmentOrFail(attachment.id);
  }

  async findRecordAttachments(options: {
    recordType: string;
    recordId: string;
    name: string;
  }): Promise<StorageAttachment[]> {
    return this.attachments.find({
      where: options,
      relations: {
        blob: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async findPreviewAttachment(
    attachmentId: string,
  ): Promise<StorageAttachment | null> {
    const [preview] = await this.findPreviewAttachments(attachmentId);

    return preview ?? null;
  }

  async findPreviewAttachments(
    attachmentId: string,
  ): Promise<StorageAttachment[]> {
    return this.attachments.find({
      where: {
        recordType: 'ActiveStorage::Attachment',
        recordId: attachmentId,
        name: 'preview_images',
      },
      relations: {
        blob: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async deleteRecordAttachments(options: {
    recordType: string;
    recordId: string;
    name: string;
  }): Promise<void> {
    const attachments = await this.findRecordAttachments(options);

    await this.attachments.remove(attachments);
  }

  createBlobProxyUrl(
    blob: StorageBlob,
    ttlSeconds: number | null = 300,
  ): string {
    const expiresAt =
      ttlSeconds === null ? null : Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = base64UrlEncode(
      JSON.stringify({
        blobId: blob.id,
        ...(expiresAt === null ? {} : { expiresAt }),
      }),
    );
    const signature = this.sign(payload);
    const apiBase = this.config.get<string>(
      'API_PUBLIC_URL',
      `http://localhost:${this.config.get<number>('PORT', 3001)}/api`,
    );

    return `${apiBase}/storage/blobs/${payload}.${signature}/${encodeURIComponent(blob.filename)}`;
  }

  async getBlobForSignedToken(token: string): Promise<StorageBlob> {
    const [payload, signature] = token.split('.');

    if (!payload || !signature || this.sign(payload) !== signature) {
      throw new ForbiddenException({ error: 'Invalid file URL' });
    }

    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      blobId?: string;
      expiresAt?: number;
    };

    if (!parsed.blobId) {
      throw new ForbiddenException({ error: 'File URL has expired' });
    }

    if (parsed.expiresAt && parsed.expiresAt < Date.now() / 1000) {
      throw new ForbiddenException({ error: 'File URL has expired' });
    }

    const blob = await this.blobs.findOne({ where: { id: parsed.blobId } });

    if (!blob) {
      throw new NotFoundException({ error: 'File not found' });
    }

    return blob;
  }

  getBlobPath(blob: StorageBlob): string {
    return resolve(this.getStorageRoot(), 'blobs', blob.key);
  }

  async readBlob(blob: StorageBlob): Promise<Buffer> {
    return readFile(this.getBlobPath(blob));
  }

  getSafeDownloadName(blob: StorageBlob): string {
    return basename(blob.filename);
  }

  private async buildPdfMetadata(
    buffer: Buffer,
    metadata: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const pdf = await PDFDocument.load(buffer);

    return {
      ...metadata,
      identified: true,
      analyzed: true,
      pdf: {
        ...(isRecord(metadata.pdf) ? metadata.pdf : {}),
        number_of_pages: pdf.getPageCount(),
      },
      sha256: createHash('sha256').update(buffer).digest('base64url'),
    };
  }

  private async generatePdfPreviewImages(
    attachment: StorageAttachment,
    buffer: Buffer,
  ): Promise<void> {
    const renderedPages = await this.pdfiumProcessing.renderPagePreviews(
      buffer,
      {
        maxPages: this.config.get<number>('PDF_PREVIEW_MAX_PAGES', 15),
        maxWidth: this.config.get<number>('PDF_PREVIEW_MAX_WIDTH', 1400),
      },
    );

    for (const [pageIndex, rendered] of renderedPages.entries()) {
      const preview = await renderPdfPageToPng(rendered);

      await this.createAttachment({
        buffer: preview,
        filename: `${pageIndex}.png`,
        contentType: 'image/png',
        name: 'preview_images',
        recordType: 'ActiveStorage::Attachment',
        recordId: attachment.id,
        metadata: {
          analyzed: true,
          identified: true,
          width: rendered.width,
          height: rendered.height,
        },
      });
    }
  }

  private async findAttachmentOrFail(
    attachmentId: string,
  ): Promise<StorageAttachment> {
    const attachment = await this.attachments.findOne({
      where: {
        id: attachmentId,
      },
      relations: {
        blob: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException({ error: 'Attachment not found' });
    }

    return attachment;
  }

  private async writeBlobData(
    blob: StorageBlob,
    buffer: Buffer,
  ): Promise<void> {
    const blobPath = this.getBlobPath(blob);
    await mkdir(join(blobPath, '..'), { recursive: true });
    await writeFile(blobPath, buffer);
    await stat(blobPath);
  }

  private buildStorageKey(filename: string): string {
    const extension = extname(filename);

    return `${randomBytes(16).toString('hex')}${extension}`;
  }

  private getStorageRoot(): string {
    const storagePath = this.config.get<string>('STORAGE_PATH', 'storage');

    if (isAbsolute(storagePath)) {
      return storagePath;
    }

    if (isBackendAppCwd() && storagePath.startsWith('apps/backend')) {
      return resolve(process.cwd(), '..', '..', storagePath);
    }

    return resolve(storagePath);
  }

  private sign(payload: string): string {
    return createHmac(
      'sha256',
      this.config.get<string>('JWT_SECRET', 'signa-development-secret'),
    )
      .update(payload)
      .digest('base64url');
  }
}

function isBackendAppCwd(): boolean {
  return process.cwd().replaceAll('\\', '/').endsWith('/apps/backend');
}

async function renderPdfPageToPng(rendered: {
  data: Buffer;
  width: number;
  height: number;
}): Promise<Buffer> {
  return sharp(rendered.data, {
    raw: {
      width: rendered.width,
      height: rendered.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
