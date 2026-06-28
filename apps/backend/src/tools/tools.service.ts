import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { In, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import {
  MergePdfsDto,
  MergePdfsResponseDto,
  VerifyPdfDto,
  VerifyPdfResponseDto,
} from './dto/tools.dto';

@Injectable()
export class ToolsService {
  constructor(
    @InjectRepository(CompletedDocument)
    private readonly completedDocuments: Repository<CompletedDocument>,
    @InjectRepository(StorageAttachment)
    private readonly storageAttachments: Repository<StorageAttachment>,
  ) {}

  async merge(input: MergePdfsDto): Promise<MergePdfsResponseDto> {
    const merged = await PDFDocument.create();

    for (const file of input.files) {
      const source = await this.loadPdf(file);
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }

    return {
      data: Buffer.from(await merged.save()).toString('base64'),
    };
  }

  async verify(input: Buffer | VerifyPdfDto): Promise<VerifyPdfResponseDto> {
    const file = this.loadVerifyInput(input);

    try {
      await PDFDocument.load(file, { ignoreEncryption: true });
    } catch {
      throw new UnprocessableEntityException({ error: 'Malformed PDF' });
    }

    const checksum = createHash('sha256').update(file).digest('base64url');
    const isChecksumFound = await this.isCompletedDocumentChecksum(checksum);

    return {
      checksum_status: isChecksumFound ? 'verified' : 'not_found',
      sha256: checksum,
      cryptographic_verification: false,
      signatures: detectPdfSignatures(file).map((signature) => ({
        verification_result: [
          'unsupported: cryptographic PDF signature validation requires a dedicated verifier service',
        ],
        signer_name: signature.signerName,
        signing_reason: signature.signingReason,
        signing_time: signature.signingTime,
        signature_type: signature.signatureType,
      })),
    };
  }

  private loadVerifyInput(input: Buffer | VerifyPdfDto): Buffer {
    if (Buffer.isBuffer(input)) {
      return input;
    }

    if (!input.file) {
      throw new UnprocessableEntityException({ error: 'PDF file is required' });
    }

    return Buffer.from(input.file, 'base64');
  }

  private async isCompletedDocumentChecksum(
    checksum: string,
  ): Promise<boolean> {
    const hasCompletedDocument = await this.completedDocuments.exists({
      where: { sha256: checksum },
    });

    if (hasCompletedDocument) {
      return true;
    }

    const completedArtifactAttachments = await this.storageAttachments.find({
      relations: { blob: true },
      where: {
        name: In([
          'documents',
          'merged_document',
          'combined_document',
          'audit_trail',
        ]),
        recordType: In(['Submitter', 'Submission']),
      },
    });

    return completedArtifactAttachments.some((attachment) => {
      const metadata = attachment.blob.metadata;

      return (
        attachment.blob.contentType === 'application/pdf' &&
        metadata &&
        typeof metadata.sha256 === 'string' &&
        metadata.sha256 === checksum
      );
    });
  }

  private async loadPdf(base64: string): Promise<PDFDocument> {
    try {
      return await PDFDocument.load(Buffer.from(base64, 'base64'), {
        ignoreEncryption: true,
      });
    } catch {
      throw new UnprocessableEntityException({ error: 'Malformed PDF' });
    }
  }
}

type DetectedPdfSignature = {
  signerName: string | null;
  signingReason: string | null;
  signingTime: string | null;
  signatureType: string | null;
};

function detectPdfSignatures(file: Buffer): DetectedPdfSignature[] {
  const text = file.toString('latin1');
  const matches = [...text.matchAll(/\/ByteRange\s*\[[^\]]+\]/g)];

  return matches.map((match) => {
    const signatureObject = extractPdfObjectContaining(text, match.index ?? 0);

    return {
      signerName: extractPdfString(signatureObject, 'Name'),
      signingReason: extractPdfString(signatureObject, 'Reason'),
      signingTime: normalizePdfDate(extractPdfString(signatureObject, 'M')),
      signatureType: extractPdfName(signatureObject, 'SubFilter'),
    };
  });
}

function extractPdfObjectContaining(text: string, index: number): string {
  const objectStart = Math.max(
    0,
    text.lastIndexOf(' obj', index) === -1
      ? text.lastIndexOf('<<', index)
      : text.lastIndexOf('\n', text.lastIndexOf(' obj', index)),
  );
  const objectEndMarker = text.indexOf('endobj', index);
  const objectEnd =
    objectEndMarker === -1
      ? Math.min(text.length, index + 20_000)
      : objectEndMarker;

  return text.slice(objectStart, objectEnd);
}

function extractPdfString(text: string, key: string): string | null {
  return extractPdfLiteral(text, key) ?? extractPdfHexString(text, key);
}

function extractPdfLiteral(text: string, key: string): string | null {
  const keyMatch = new RegExp(`/${key}\\s*\\(`).exec(text);

  if (!keyMatch || keyMatch.index === undefined) {
    return null;
  }

  const valueStart = keyMatch.index + keyMatch[0].length;
  let escaped = false;

  for (let index = valueStart; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === ')') {
      return unescapePdfLiteral(text.slice(valueStart, index));
    }
  }

  return null;
}

function extractPdfHexString(text: string, key: string): string | null {
  const match = new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]+)>`).exec(text);

  if (!match) {
    return null;
  }

  const hex = match[1].replace(/\s/g, '');

  if (!hex) {
    return null;
  }

  const buffer = Buffer.from(hex, 'hex');

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return buffer.subarray(2).toString('utf16le').replace(/\0/g, '');
  }

  return buffer.toString('utf8');
}

function unescapePdfLiteral(value: string): string {
  return value
    .replaceAll('\\\\', '\\')
    .replaceAll('\\(', '(')
    .replaceAll('\\)', ')')
    .replaceAll('\\n', '\n')
    .replaceAll('\\r', '\r')
    .replaceAll('\\t', '\t')
    .replaceAll('\\b', '\b')
    .replaceAll('\\f', '\f');
}

function extractPdfName(text: string, key: string): string | null {
  const match = new RegExp(`/${key}\\s*/([A-Za-z0-9_.-]+)`).exec(text);

  return match?.[1] ?? null;
}

function normalizePdfDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.startsWith('D:') ? value.slice(2) : value;
}
