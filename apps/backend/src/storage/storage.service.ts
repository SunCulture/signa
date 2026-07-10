import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
  type ServerSideEncryption,
} from '@aws-sdk/client-s3';
import {
  ForbiddenException,
  Injectable,
  Logger,
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
import { PdfjsProcessingService } from '../pdf-processing/pdfjs-processing.service';
import { PdfiumProcessingService } from '../pdf-processing/pdfium-processing.service';
import { StorageAttachment } from './entities/storage-attachment.entity';
import { StorageBlob } from './entities/storage-blob.entity';
import { CreateAttachmentInput } from './storage.types';

type StorageServiceName = 'local' | 's3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;

  constructor(
    @InjectRepository(StorageBlob)
    private readonly blobs: Repository<StorageBlob>,
    @InjectRepository(StorageAttachment)
    private readonly attachments: Repository<StorageAttachment>,
    private readonly config: ConfigService,
    private readonly pdfiumProcessing: PdfiumProcessingService,
    private readonly pdfjsProcessing: PdfjsProcessingService,
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
        serviceName: this.getWriteStorageServiceName(),
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
    const prepared = await this.preparePdfForStorage(
      input.buffer,
      input.metadata,
    );
    const attachment = await this.createAttachment({
      ...input,
      buffer: prepared.buffer,
      contentType: 'application/pdf',
      metadata: prepared.metadata,
    });

    await this.generatePdfPreviewImages(attachment, prepared.buffer);
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
    if (blob.serviceName === 's3') {
      throw new Error('S3 blobs do not have a local filesystem path.');
    }

    return resolve(this.getStorageRoot(), 'blobs', blob.key);
  }

  async readBlob(blob: StorageBlob): Promise<Buffer> {
    if (blob.serviceName === 's3') {
      return this.readS3Blob(blob);
    }

    return readFile(this.getBlobPath(blob));
  }

  getSafeDownloadName(blob: StorageBlob): string {
    return basename(blob.filename);
  }

  private async buildPdfMetadata(
    buffer: Buffer,
    metadata: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const formMetadata = await this.pdfiumProcessing.inspectPdf(buffer);
    const pdf = await PDFDocument.load(buffer);

    return {
      ...metadata,
      identified: true,
      analyzed: true,
      pdf: {
        ...(isRecord(metadata.pdf) ? metadata.pdf : {}),
        form_type: formMetadata.formType,
        has_xfa: formMetadata.hasXfa,
        number_of_pages: pdf.getPageCount(),
        processing_mode: formMetadata.processingMode,
        xfa_load_status: formMetadata.xfaLoadStatus,
        xfa_loaded: formMetadata.xfaLoaded,
        xfa_packet_count: formMetadata.xfaPacketCount,
        xfa_packet_names: formMetadata.xfaPacketNames,
      },
      sha256: createHash('sha256').update(buffer).digest('base64url'),
    };
  }

  private async preparePdfForStorage(
    buffer: Buffer,
    metadata: Record<string, unknown> = {},
  ): Promise<{ buffer: Buffer; metadata: Record<string, unknown> }> {
    const sourceMetadata = await this.buildPdfMetadata(buffer, metadata);

    if (!shouldRasterizeXfa(sourceMetadata)) {
      return {
        buffer,
        metadata: sourceMetadata,
      };
    }

    this.logger.warn(
      'PDFium cannot load this XFA document. Rasterizing with PDF.js before storage.',
    );

    const rasterized = await this.pdfjsProcessing.rasterizePdf(buffer, {
      scale: this.config.get<number>('PDF_XFA_RASTERIZE_SCALE', 2),
    });
    const rasterizedMetadata = await this.buildPdfMetadata(
      rasterized.buffer,
      metadata,
    );

    return {
      buffer: rasterized.buffer,
      metadata: mergeXfaRasterizationMetadata(
        rasterizedMetadata,
        sourceMetadata,
        rasterized.pageCount,
      ),
    };
  }

  private async generatePdfPreviewImages(
    attachment: StorageAttachment,
    buffer: Buffer,
  ): Promise<void> {
    const options = {
      maxPages: this.config.get<number>('PDF_PREVIEW_MAX_PAGES', 15),
      maxWidth: this.config.get<number>('PDF_PREVIEW_MAX_WIDTH', 1400),
    };
    const renderedPages = shouldRenderXfaPreviewWithPdfjs(attachment)
      ? await this.pdfjsProcessing.renderPagePreviews(buffer, options)
      : await this.pdfiumProcessing.renderPagePreviews(buffer, options);

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
    if (blob.serviceName === 's3') {
      await this.writeS3Blob(blob, buffer);
      return;
    }

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

  private getWriteStorageServiceName(): StorageServiceName {
    const mode = this.config.get<string>('STORAGE_SERVICE', 'auto');

    if (mode === 'local' || mode === 's3') {
      return mode;
    }

    return this.hasS3Config() ? 's3' : 'local';
  }

  private hasS3Config(): boolean {
    return Boolean(
      this.config.get<string>('AWS_S3_BUCKET') &&
      this.config.get<string>('AWS_REGION'),
    );
  }

  private getS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID', '');
    const secretAccessKey = this.config.get<string>(
      'AWS_SECRET_ACCESS_KEY',
      '',
    );
    const sessionToken = this.config.get<string>('AWS_SESSION_TOKEN', '');
    const endpoint = this.config.get<string>('AWS_S3_ENDPOINT', '');

    this.s3Client = new S3Client({
      region: this.getS3Region(),
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: this.config.get<boolean>(
        'AWS_S3_FORCE_PATH_STYLE',
        false,
      ),
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
              ...(sessionToken ? { sessionToken } : {}),
            },
          }
        : {}),
    });

    return this.s3Client;
  }

  private async writeS3Blob(blob: StorageBlob, buffer: Buffer): Promise<void> {
    await this.getS3Client().send(
      new PutObjectCommand({
        Body: buffer,
        Bucket: this.getS3Bucket(),
        ContentLength: buffer.byteLength,
        ContentType: blob.contentType ?? undefined,
        Key: this.getS3ObjectKey(blob),
        ServerSideEncryption: this.getS3ServerSideEncryption(),
      }),
    );
  }

  private async readS3Blob(blob: StorageBlob): Promise<Buffer> {
    const response = await this.getS3Client().send(
      new GetObjectCommand({
        Bucket: this.getS3Bucket(),
        Key: this.getS3ObjectKey(blob),
      }),
    );

    return s3BodyToBuffer(response.Body);
  }

  private getS3Bucket(): string {
    const bucket = this.config.get<string>('AWS_S3_BUCKET');

    if (!bucket) {
      throw new Error('AWS_S3_BUCKET is required when S3 storage is enabled.');
    }

    return bucket;
  }

  private getS3Region(): string {
    const region = this.config.get<string>('AWS_REGION');

    if (!region) {
      throw new Error('AWS_REGION is required when S3 storage is enabled.');
    }

    return region;
  }

  private getS3ObjectKey(blob: StorageBlob): string {
    const prefix = this.config.get<string>('AWS_S3_PREFIX', '').trim();
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');

    return normalizedPrefix ? `${normalizedPrefix}/${blob.key}` : blob.key;
  }

  private getS3ServerSideEncryption(): ServerSideEncryption | undefined {
    const value = this.config.get<string>('AWS_S3_SERVER_SIDE_ENCRYPTION', '');

    if (value === 'AES256' || value === 'aws:kms') {
      return value;
    }

    return undefined;
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

async function s3BodyToBuffer(
  body: GetObjectCommandOutput['Body'],
): Promise<Buffer> {
  if (!body) {
    throw new NotFoundException({ error: 'File not found' });
  }

  if ('transformToByteArray' in body) {
    const bytes = await body.transformToByteArray();

    return Buffer.from(bytes);
  }

  const stream = body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldRasterizeXfa(metadata: Record<string, unknown>): boolean {
  const pdf = isRecord(metadata.pdf) ? metadata.pdf : {};

  return pdf.processing_mode === 'xfa' && pdf.xfa_load_status === 'unsupported';
}

function shouldRenderXfaPreviewWithPdfjs(
  attachment: StorageAttachment,
): boolean {
  const metadata = isRecord(attachment.blob.metadata)
    ? attachment.blob.metadata
    : {};

  return shouldRasterizeXfa(metadata);
}

function mergeXfaRasterizationMetadata(
  rasterizedMetadata: Record<string, unknown>,
  sourceMetadata: Record<string, unknown>,
  pageCount: number,
): Record<string, unknown> {
  const rasterizedPdf = isRecord(rasterizedMetadata.pdf)
    ? rasterizedMetadata.pdf
    : {};
  const sourcePdf = isRecord(sourceMetadata.pdf) ? sourceMetadata.pdf : {};

  return {
    ...rasterizedMetadata,
    pdf: {
      ...rasterizedPdf,
      source_form_type: sourcePdf.form_type,
      source_has_xfa: sourcePdf.has_xfa,
      source_processing_mode: sourcePdf.processing_mode,
      source_xfa_load_status: sourcePdf.xfa_load_status,
      source_xfa_packet_count: sourcePdf.xfa_packet_count,
      source_xfa_packet_names: sourcePdf.xfa_packet_names,
      xfa_converted_by: 'pdfjs',
      xfa_converted_page_count: pageCount,
      xfa_rasterized: true,
    },
    source_sha256: sourceMetadata.sha256,
  };
}
