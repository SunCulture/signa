import {
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import {
  SUBFILTER_ADOBE_PKCS7_DETACHED,
  SUBFILTER_ETSI_CADES_DETACHED,
} from '@signpdf/utils';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import { PdfDssVriEmbedder } from './pdf-dss-vri-embedder';
import { PdfDocumentTimestampEmbedder } from './pdf-document-timestamp-embedder';
import { PdfAResult, PdfAService } from './pdf-a.service';
import {
  defaultSigningCertificateKey,
  generateSignaDefaultCertificate,
  hasInternalRevocation,
  parseStoredSigningCertificate,
  p12BufferFromStoredCertificate,
  signaDefaultCertificateName,
  signingCertificatePrefix,
  StoredSigningCertificate,
  timestampServerUrlKey,
} from './pdf-signature-certificate';
import { PdfTimestampEvidence } from './pdf-timestamp-evidence';
import {
  PdfLtvCollectionResult,
  PdfRevocationCollectorService,
} from './pdf-revocation-collector.service';
import { Rfc3161TimestampClient } from './rfc3161-timestamp-client';

export const pdfSignatureSubFilterModes = ['pades', 'adobe'] as const;

export type PdfSignatureSubFilterMode =
  (typeof pdfSignatureSubFilterModes)[number];

export type PdfSignatureResult = {
  buffer: Buffer;
  certificateName: string | null;
  pdfA: PdfAResult['metadata'];
  signed: boolean;
  signatureSubFilter: string;
  timestamp: PdfTimestampEvidence;
  timestampServerUrl: string | null;
  ltv: PdfLtvCollectionResult['metadata'];
};

@Injectable()
export class PdfSignatureService {
  private readonly logger = new Logger(PdfSignatureService.name);

  constructor(
    @InjectRepository(EncryptedConfig)
    private readonly encryptedConfigs: Repository<EncryptedConfig>,
    private readonly config: ConfigService,
    private readonly timestampClient: Rfc3161TimestampClient,
    private readonly timestampEmbedder: PdfDocumentTimestampEmbedder,
    private readonly revocationCollector: PdfRevocationCollectorService,
    private readonly dssVriEmbedder: PdfDssVriEmbedder,
    private readonly pdfAService: PdfAService,
  ) {}

  async ensureDefaultCertificate(accountId: string): Promise<EncryptedConfig> {
    const existing = await this.encryptedConfigs.findOne({
      where: {
        accountId,
        key: `${signingCertificatePrefix}${signaDefaultCertificateName}`,
      },
    });

    if (existing) {
      const existingCertificate = parseStoredSigningCertificate(existing.value);

      if (!existingCertificate || !hasInternalRevocation(existingCertificate)) {
        existing.value = JSON.stringify(generateSignaDefaultCertificate());

        return this.encryptedConfigs.save(existing);
      }

      return existing;
    }

    return this.encryptedConfigs.save(
      this.encryptedConfigs.create({
        accountId,
        key: `${signingCertificatePrefix}${signaDefaultCertificateName}`,
        value: JSON.stringify(generateSignaDefaultCertificate()),
      }),
    );
  }

  async getTimestampServerUrl(accountId: string): Promise<string | null> {
    const config = await this.encryptedConfigs.findOne({
      where: { accountId, key: timestampServerUrlKey },
    });

    return config?.value || null;
  }

  async upsertTimestampServerUrl(
    accountId: string,
    value: string | null,
  ): Promise<string | null> {
    const normalized = value?.trim() ?? '';
    const existing = await this.encryptedConfigs.findOne({
      where: { accountId, key: timestampServerUrlKey },
    });

    if (!normalized) {
      if (existing) {
        await this.encryptedConfigs.remove(existing);
      }

      return null;
    }

    await this.timestampClient.assertTimestampServerWorks(normalized);

    const config =
      existing ??
      this.encryptedConfigs.create({
        accountId,
        key: timestampServerUrlKey,
      });

    config.value = normalized;
    await this.encryptedConfigs.save(config);

    return normalized;
  }

  async loadDefaultCertificate(accountId: string): Promise<{
    certificate: StoredSigningCertificate;
    name: string;
  }> {
    await this.ensureDefaultCertificate(accountId);

    const defaultConfig = await this.encryptedConfigs.findOne({
      where: { accountId, key: defaultSigningCertificateKey },
    });
    const defaultName = defaultConfig?.value || signaDefaultCertificateName;
    const certificateConfig = await this.encryptedConfigs.findOne({
      where: {
        accountId,
        key: `${signingCertificatePrefix}${defaultName}`,
      },
    });

    if (!certificateConfig) {
      return this.loadGeneratedCertificate(accountId);
    }

    const certificate = parseStoredSigningCertificate(certificateConfig.value);

    if (!certificate) {
      this.logger.warn(
        `Skipping malformed signing certificate "${defaultName}" for account ${accountId}`,
      );

      return this.loadGeneratedCertificate(accountId);
    }

    return { certificate, name: defaultName };
  }

  async signPdf(input: {
    accountId: string;
    buffer: Buffer;
    contactInfo?: string | null;
    reason: string;
    signerName: string;
    signingTime?: Date;
  }): Promise<PdfSignatureResult> {
    const startedAt = Date.now();
    const [{ certificate, name }, timestampServerUrl] = await Promise.all([
      this.loadDefaultCertificate(input.accountId),
      this.getTimestampServerUrl(input.accountId),
    ]);
    const configurationReadyAt = Date.now();
    const signatureSubFilter = this.getSignatureSubFilter();

    try {
      const pdfA = await this.pdfAService.convertBeforeSigning(input.buffer);
      const pdfAReadyAt = Date.now();
      const pdf = await PDFDocument.load(pdfA.buffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });

      pdflibAddPlaceholder({
        appName: 'Signa',
        contactInfo: input.contactInfo ?? '',
        location: '',
        name: input.signerName,
        pdfDoc: pdf,
        reason: input.reason,
        signatureLength: 16_384,
        signingTime: input.signingTime ?? new Date(),
        subFilter: signatureSubFilter,
      });

      const prepared = Buffer.from(
        await pdf.save({
          addDefaultPage: false,
          useObjectStreams: false,
        }),
      );
      const signer = new P12Signer(
        p12BufferFromStoredCertificate(certificate),
        {
          passphrase: certificate.password ?? '',
        },
      );

      const signedBuffer = await signpdf.sign(
        prepared,
        signer,
        input.signingTime,
      );
      const cmsReadyAt = Date.now();
      const ltv = await this.revocationCollector.collectForSignedPdf({
        accountId: input.accountId,
        internalRevocation: certificate.internal_revocation ?? null,
        pdfBuffer: signedBuffer,
      });
      const revocationReadyAt = Date.now();

      if (ltv.metadata.ltvRequired && ltv.metadata.evidenceStatus !== 'good') {
        throw new UnprocessableEntityException({
          error:
            'PDF LTV evidence could not be collected for the signer certificate',
          ltv_status: 'missing',
          revocation_status: ltv.metadata.evidenceStatus,
        });
      }

      const ltvPdf = this.dssVriEmbedder.embed({
        evidences: ltv.evidences,
        pdfBuffer: signedBuffer,
      });
      const dssReadyAt = Date.now();
      const timestampedPdf =
        await this.timestampEmbedder.embedDocumentTimestamp({
          pdfBuffer: ltvPdf,
          timestampServerUrl,
        });
      const completedAt = Date.now();

      const finalEvidenceStatus =
        ltv.metadata.evidenceStatus === 'good' &&
        this.hasEmbeddedDssEvidence(signedBuffer, ltvPdf)
          ? 'good'
          : ltv.metadata.evidenceStatus;

      const finalLtv = {
        ...ltv.metadata,
        evidenceStatus: finalEvidenceStatus,
      };

      if (finalLtv.ltvRequired && finalLtv.evidenceStatus !== 'good') {
        throw new UnprocessableEntityException({
          error: 'PDF LTV evidence could not be embedded into the signed PDF',
          ltv_status: 'missing',
          revocation_status: finalLtv.evidenceStatus,
        });
      }

      this.logger.debug(
        `PDF signing completed ${JSON.stringify({
          accountId: input.accountId,
          bytes: input.buffer.byteLength,
          cmsMs: cmsReadyAt - pdfAReadyAt,
          configurationMs: configurationReadyAt - startedAt,
          dssMs: dssReadyAt - revocationReadyAt,
          pdfAMs: pdfAReadyAt - configurationReadyAt,
          revocationMs: revocationReadyAt - cmsReadyAt,
          timestampMs: completedAt - dssReadyAt,
          totalMs: completedAt - startedAt,
        })}`,
      );

      return {
        buffer: timestampedPdf.buffer,
        certificateName: name,
        ltv: finalLtv,
        pdfA: pdfA.metadata,
        signatureSubFilter,
        signed: true,
        timestamp: timestampedPdf.timestamp,
        timestampServerUrl,
      };
    } catch (error) {
      this.logger.error(
        `PDF cryptographic signing failed for account ${input.accountId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private async loadGeneratedCertificate(accountId: string): Promise<{
    certificate: StoredSigningCertificate;
    name: string;
  }> {
    const config = await this.ensureDefaultCertificate(accountId);
    const certificate = parseStoredSigningCertificate(config.value);

    if (!certificate) {
      throw new Error('Generated Signa signing certificate is malformed');
    }

    return { certificate, name: signaDefaultCertificateName };
  }

  private getSignatureSubFilter(): string {
    const mode = this.config.get<PdfSignatureSubFilterMode>(
      'PDF_SIGNATURE_SUBFILTER',
      'pades',
    );

    return mode === 'adobe'
      ? SUBFILTER_ADOBE_PKCS7_DETACHED
      : SUBFILTER_ETSI_CADES_DETACHED;
  }

  private hasEmbeddedDssEvidence(
    signedBuffer: Buffer,
    ltvBuffer: Buffer,
  ): boolean {
    return (
      ltvBuffer.byteLength > signedBuffer.byteLength &&
      ltvBuffer.includes('/DSS')
    );
  }
}
