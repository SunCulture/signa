import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import * as asn1js from 'asn1js';
import forge from 'node-forge';
import { Certificate } from 'pkijs';
import { Repository } from 'typeorm';
import type { UploadedBufferFile } from '../storage/storage.types';
import { toArrayBuffer } from './pdf-cms-utils';
import { PdfTrustRoot } from './entities/pdf-trust-root.entity';

export type PdfTrustRootResponse = {
  created_at: string;
  enabled: boolean;
  fingerprint_sha256: string;
  id: string;
  issuer: string;
  name: string;
  serial_number: string;
  subject: string;
  valid_from: string;
  valid_to: string;
};

@Injectable()
export class PdfTrustRootService {
  constructor(
    @InjectRepository(PdfTrustRoot)
    private readonly trustRoots: Repository<PdfTrustRoot>,
  ) {}

  async list(accountId: string): Promise<PdfTrustRootResponse[]> {
    const roots = await this.trustRoots.find({
      order: { createdAt: 'ASC' },
      where: { accountId },
    });

    return roots.map(toTrustRootResponse);
  }

  async upload(input: {
    accountId: string;
    file: UploadedBufferFile;
    name?: string;
  }): Promise<PdfTrustRootResponse> {
    if (!input.file?.buffer?.length) {
      throw new UnprocessableEntityException({
        error: 'Trust root certificate file is required',
      });
    }

    const inspection = inspectTrustRootCertificate(input.file.buffer);
    const name = normalizeTrustRootName(input.name || input.file.originalname);
    const existing = await this.trustRoots.findOne({
      where: {
        accountId: input.accountId,
        fingerprintSha256: inspection.fingerprintSha256,
      },
    });
    const root =
      existing ??
      this.trustRoots.create({
        accountId: input.accountId,
        fingerprintSha256: inspection.fingerprintSha256,
      });

    root.certificateDerBase64 = inspection.der.toString('base64');
    root.enabled = true;
    root.issuer = inspection.issuer;
    root.name = name;
    root.serialNumber = inspection.serialNumber;
    root.subject = inspection.subject;
    root.validFrom = inspection.validFrom;
    root.validTo = inspection.validTo;

    return toTrustRootResponse(await this.trustRoots.save(root));
  }

  async remove(input: {
    accountId: string;
    id: string;
  }): Promise<PdfTrustRootResponse> {
    const root = await this.trustRoots.findOne({
      where: { accountId: input.accountId, id: input.id },
    });

    if (!root) {
      throw new NotFoundException({ error: 'Trust root not found' });
    }

    const response = toTrustRootResponse(root);

    await this.trustRoots.remove(root);
    return response;
  }

  async getTrustedCertificates(accountId: string): Promise<Certificate[]> {
    const roots = await this.trustRoots.find({
      where: { accountId, enabled: true },
    });

    return roots.map((root) =>
      parsePkijsCertificate(Buffer.from(root.certificateDerBase64, 'base64')),
    );
  }
}

function inspectTrustRootCertificate(buffer: Buffer): {
  der: Buffer;
  fingerprintSha256: string;
  issuer: string;
  serialNumber: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
} {
  try {
    const certificate = parseForgeCertificate(buffer);
    const basicConstraints = certificate.getExtension('basicConstraints');
    const keyUsage = certificate.getExtension('keyUsage');

    if (
      !getBooleanProperty(basicConstraints, 'cA') ||
      getBooleanProperty(keyUsage, 'keyCertSign') === false
    ) {
      throw new Error('certificate must be a CA certificate');
    }

    const der = Buffer.from(
      forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes(),
      'binary',
    );

    return {
      der,
      fingerprintSha256: createHash('sha256').update(der).digest('hex'),
      issuer: formatForgeName(certificate.issuer.attributes),
      serialNumber: certificate.serialNumber,
      subject: formatForgeName(certificate.subject.attributes),
      validFrom: certificate.validity.notBefore,
      validTo: certificate.validity.notAfter,
    };
  } catch (error) {
    throw new UnprocessableEntityException({
      error:
        error instanceof Error
          ? `Invalid trust root certificate: ${error.message}`
          : 'Invalid trust root certificate',
    });
  }
}

function parseForgeCertificate(buffer: Buffer): forge.pki.Certificate {
  const text = buffer.toString('utf8');

  if (text.includes('-----BEGIN CERTIFICATE-----')) {
    return forge.pki.certificateFromPem(text);
  }

  const asn1 = forge.asn1.fromDer(buffer.toString('binary'));

  return forge.pki.certificateFromAsn1(asn1);
}

function parsePkijsCertificate(buffer: Buffer): Certificate {
  const asn1 = asn1js.fromBER(toArrayBuffer(buffer));

  if (asn1.offset === -1) {
    throw new UnprocessableEntityException({
      error: 'Trust root certificate could not be parsed',
    });
  }

  return new Certificate({ schema: asn1.result });
}

function normalizeTrustRootName(value?: string): string {
  const normalized = value?.replace(/\.[^.]+$/, '').trim();

  if (!normalized) {
    throw new UnprocessableEntityException({
      error: 'Trust root name is required',
    });
  }

  return normalized.slice(0, 255);
}

function formatForgeName(attributes: forge.pki.CertificateField[]): string {
  return attributes
    .map((attribute) => {
      const name = attribute.shortName ?? attribute.name;
      const value =
        typeof attribute.value === 'string'
          ? attribute.value
          : String(attribute.value);

      return `${name}=${value}`;
    })
    .join(', ');
}

function getBooleanProperty(value: unknown, key: string): boolean | undefined {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return undefined;
  }

  const property = (value as Record<string, unknown>)[key];

  return typeof property === 'boolean' ? property : undefined;
}

function toTrustRootResponse(root: PdfTrustRoot): PdfTrustRootResponse {
  return {
    created_at: root.createdAt.toISOString(),
    enabled: root.enabled,
    fingerprint_sha256: root.fingerprintSha256,
    id: root.id,
    issuer: root.issuer,
    name: root.name,
    serial_number: root.serialNumber,
    subject: root.subject,
    valid_from: root.validFrom.toISOString(),
    valid_to: root.validTo.toISOString(),
  };
}
