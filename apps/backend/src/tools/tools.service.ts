import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import type { Certificate } from 'pkijs';
import { PDFDocument } from 'pdf-lib';
import { In, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import { PdfTrustRootService } from '../pdf-signatures/pdf-trust-root.service';
import {
  detectPdfSignatures,
  DetectedPdfSignature,
} from '../pdf-signatures/pdf-signature-detection';
import {
  MergePdfsDto,
  MergePdfsResponseDto,
  VerifyPdfDto,
  VerifyPdfResponseDto,
} from './dto/tools.dto';
import { PdfSignatureVerifierService } from './pdf-signature-verifier.service';

@Injectable()
export class ToolsService {
  constructor(
    @InjectRepository(CompletedDocument)
    private readonly completedDocuments: Repository<CompletedDocument>,
    @InjectRepository(StorageAttachment)
    private readonly storageAttachments: Repository<StorageAttachment>,
    private readonly pdfSignatureVerifier: PdfSignatureVerifierService,
    private readonly pdfTrustRootService: PdfTrustRootService,
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

  async verify(input: VerifyPdfServiceInput): Promise<VerifyPdfResponseDto> {
    const normalizedInput = normalizeVerifyServiceInput(input);
    const file = this.loadVerifyInput(normalizedInput.file);
    const trustedCertificates = normalizedInput.accountId
      ? await this.pdfTrustRootService.getTrustedCertificates(
          normalizedInput.accountId,
        )
      : [];

    try {
      await PDFDocument.load(file, { ignoreEncryption: true });
    } catch {
      throw new UnprocessableEntityException({ error: 'Malformed PDF' });
    }

    const checksum = createHash('sha256').update(file).digest('base64url');
    const isChecksumFound = await this.isCompletedDocumentChecksum(checksum);

    const signatures = await Promise.all(
      detectPdfSignatures(file).map((signature) =>
        this.toSignatureVerificationResponse({
          file,
          isChecksumFound,
          signature,
          trustedCertificates,
        }),
      ),
    );

    return {
      checksum_status: isChecksumFound ? 'verified' : 'not_found',
      sha256: checksum,
      cryptographic_verification: signatures.some(
        (signature) => signature.cms_signature_valid === true,
      ),
      signatures,
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

  private async toSignatureVerificationResponse(input: {
    file: Buffer;
    isChecksumFound: boolean;
    signature: DetectedPdfSignature;
    trustedCertificates: Certificate[];
  }) {
    const { file, isChecksumFound, signature, trustedCertificates } = input;
    const cmsVerification = await this.pdfSignatureVerifier.verify({
      cmsContents: signature.contents,
      pdfBuffer: file,
      signedBytes: signature.byteRange.signedBytes,
      trustedCertificates,
    });
    const messages = [
      isChecksumFound
        ? 'checksum_verified: final PDF bytes match a completed Signa document'
        : 'checksum_not_found: final PDF bytes were not found in completed Signa documents',
      signature.byteRange.valid
        ? 'byte_range_valid: PDF signature ByteRange is structurally valid'
        : 'byte_range_invalid: PDF signature ByteRange is malformed or outside the file bounds',
      signature.signatureType === padesSubFilter
        ? 'pades_subfilter: signature uses ETSI.CAdES.detached'
        : 'legacy_subfilter: signature does not use ETSI.CAdES.detached',
      signature.isTimestampSignature
        ? 'timestamp_signature: PDF contains an embedded RFC3161 document timestamp signature'
        : 'timestamp_signature_missing: PDF does not contain an embedded RFC3161 document timestamp signature',
      ...cmsVerification.messages,
      signature.hasDss
        ? 'dss_present: PDF contains a DSS dictionary for long-term validation evidence'
        : 'dss_missing: PDF does not contain a DSS dictionary for long-term validation evidence',
    ];

    return {
      byte_range_sha256: signature.byteRange.sha256,
      byte_range_valid: signature.byteRange.valid,
      certificate_chain: cmsVerification.certificateChain.map(
        certificateToResponse,
      ),
      certificate_chain_status: cmsVerification.certificateChainStatus,
      certificate_policy_errors: cmsVerification.certificatePolicyErrors,
      cms_message_digest_valid: cmsVerification.cmsMessageDigestValid,
      cms_signature_valid: cmsVerification.cmsSignatureValid,
      ltv_status: cmsVerification.ltvStatus,
      pades_compliant_sub_filter: signature.signatureType === padesSubFilter,
      revocation_status: cmsVerification.revocationStatus,
      verification_result: messages,
      signer_name:
        signature.signerName ??
        getTimestampAuthorityName(signature, cmsVerification.certificateChain),
      signing_reason: signature.isTimestampSignature
        ? 'Document timestamp'
        : signature.signingReason,
      signing_time: normalizeSignatureTime(signature.signingTime),
      signature_type: signature.signatureType,
      timestamp_signature: signature.isTimestampSignature,
      trust_anchor: cmsVerification.trustAnchor,
      trust_anchor_fingerprint: cmsVerification.trustAnchorFingerprint,
    };
  }
}

type VerifyPdfServiceInput =
  | Buffer
  | VerifyPdfDto
  | {
      accountId?: string | null;
      file: Buffer | VerifyPdfDto;
    };

function normalizeVerifyServiceInput(input: VerifyPdfServiceInput): {
  accountId: string | null;
  file: Buffer | VerifyPdfDto;
} {
  if (
    !Buffer.isBuffer(input) &&
    'accountId' in input &&
    'file' in input &&
    (Buffer.isBuffer(input.file) || typeof input.file === 'object')
  ) {
    return {
      accountId: input.accountId ?? null,
      file: input.file,
    };
  }

  return {
    accountId: null,
    file: input as Buffer | VerifyPdfDto,
  };
}

type PdfSignatureCertificate = {
  issuer: string | null;
  serialNumber: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
};

const padesSubFilter = 'ETSI.CAdES.detached';

function certificateToResponse(
  certificate: PdfSignatureCertificate,
): Record<string, string | null> {
  return {
    issuer: certificate.issuer,
    serial_number: certificate.serialNumber,
    subject: certificate.subject,
    valid_from: certificate.validFrom,
    valid_to: certificate.validTo,
  };
}

function getTimestampAuthorityName(
  signature: DetectedPdfSignature,
  certificateChain: PdfSignatureCertificate[],
): string | null {
  if (!signature.isTimestampSignature) {
    return null;
  }

  return (
    extractCertificateCommonName(certificateChain.at(0)?.subject) ??
    extractCertificateCommonName(certificateChain.at(0)?.issuer) ??
    'timestamp authority'
  );
}

function extractCertificateCommonName(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const commonName = /(?:^|,\s*)CN=([^,]+)/.exec(value)?.[1]?.trim();

  return commonName || value;
}

function normalizeSignatureTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = parseSignatureDate(value);

  return parsed?.toISOString() ?? value;
}

function parseSignatureDate(value: string): Date | null {
  const normalized = value.startsWith('D:') ? value.slice(2) : value;
  const generalizedTimeMatch =
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(normalized);

  if (generalizedTimeMatch) {
    const [, year, month, day, hour, minute, second] = generalizedTimeMatch;

    return validDate(
      new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`),
    );
  }

  const pdfDateMatch =
    /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}'?\d{2}'?)?$/.exec(
      normalized,
    );

  if (!pdfDateMatch) {
    return null;
  }

  const [
    ,
    year,
    month,
    day,
    hour = '00',
    minute = '00',
    second = '00',
    timezone = '',
  ] = pdfDateMatch;

  return validDate(
    new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}${formatPdfTimezone(
        timezone,
      )}`,
    ),
  );
}

function formatPdfTimezone(timezone: string): string {
  if (!timezone || timezone === 'Z') {
    return 'Z';
  }

  const normalized = timezone.replaceAll("'", '');

  return `${normalized.slice(0, 3)}:${normalized.slice(3, 5)}`;
}

function validDate(date: Date): Date | null {
  return Number.isNaN(date.getTime()) ? null : date;
}
