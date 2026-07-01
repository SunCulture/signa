import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { In, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
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

    const signatures = await Promise.all(
      detectPdfSignatures(file).map((signature) =>
        this.toSignatureVerificationResponse(signature, isChecksumFound, file),
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

  private async toSignatureVerificationResponse(
    signature: DetectedPdfSignature,
    isChecksumFound: boolean,
    file: Buffer,
  ) {
    const cmsVerification = await this.pdfSignatureVerifier.verify({
      cmsContents: signature.contents,
      pdfBuffer: file,
      signedBytes: signature.byteRange.signedBytes,
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
      cms_message_digest_valid: cmsVerification.cmsMessageDigestValid,
      cms_signature_valid: cmsVerification.cmsSignatureValid,
      ltv_status: cmsVerification.ltvStatus,
      pades_compliant_sub_filter: signature.signatureType === padesSubFilter,
      revocation_status: cmsVerification.revocationStatus,
      verification_result: messages,
      signer_name: signature.signerName,
      signing_reason: signature.signingReason,
      signing_time: signature.signingTime,
      signature_type: signature.signatureType,
      timestamp_signature: signature.isTimestampSignature,
    };
  }
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
