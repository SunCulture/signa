import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import {
  defaultSigningCertificateKey,
  generateSignaDefaultCertificate,
  parseStoredSigningCertificate,
  p12BufferFromStoredCertificate,
  signaDefaultCertificateName,
  signingCertificatePrefix,
  StoredSigningCertificate,
  timestampServerUrlKey,
} from './pdf-signature-certificate';

const subfilterAdobePkcs7Detached = 'adbe.pkcs7.detached';

export type PdfSignatureResult = {
  buffer: Buffer;
  certificateName: string | null;
  signed: boolean;
  timestampServerUrl: string | null;
};

@Injectable()
export class PdfSignatureService {
  private readonly logger = new Logger(PdfSignatureService.name);

  constructor(
    @InjectRepository(EncryptedConfig)
    private readonly encryptedConfigs: Repository<EncryptedConfig>,
  ) {}

  async ensureDefaultCertificate(accountId: string): Promise<EncryptedConfig> {
    const existing = await this.encryptedConfigs.findOne({
      where: {
        accountId,
        key: `${signingCertificatePrefix}${signaDefaultCertificateName}`,
      },
    });

    if (existing) {
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

    new URL(normalized);

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
    const { certificate, name } = await this.loadDefaultCertificate(
      input.accountId,
    );
    const timestampServerUrl = await this.getTimestampServerUrl(
      input.accountId,
    );

    try {
      const pdf = await PDFDocument.load(input.buffer, {
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
        subFilter: subfilterAdobePkcs7Detached,
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

      return {
        buffer: await signpdf.sign(prepared, signer, input.signingTime),
        certificateName: name,
        signed: true,
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
}
