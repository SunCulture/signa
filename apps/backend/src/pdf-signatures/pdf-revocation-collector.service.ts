import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import * as asn1js from 'asn1js';
import {
  BasicOCSPResponse,
  Certificate,
  CertificateRevocationList,
  id_PKIX_OCSP_Basic,
  OCSPRequest,
  OCSPResponse,
} from 'pkijs';
import {
  certificateToDer,
  ParsedPdfCmsSignature,
  parsePdfCmsSignature,
  toArrayBuffer,
} from './pdf-cms-utils';
import { PdfDssEvidence, ParsedPdfDssEvidence } from './pdf-dss-vri-embedder';
import { detectPdfSignatures } from './pdf-signature-detection';
import { PdfRevocationEvidenceStatus } from './entities/pdf-revocation-evidence.entity';
import { PdfRevocationEvidenceService } from './pdf-revocation-evidence.service';

export type PdfLtvCollectionResult = {
  evidences: PdfDssEvidence[];
  metadata: {
    evidenceStatus: PdfRevocationEvidenceStatus | 'missing';
    ltvRequired: boolean;
  };
};

@Injectable()
export class PdfRevocationCollectorService {
  private readonly logger = new Logger(PdfRevocationCollectorService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly evidenceCache: PdfRevocationEvidenceService,
  ) {}

  async collectForSignedPdf(input: {
    accountId: string;
    pdfBuffer: Buffer;
  }): Promise<PdfLtvCollectionResult> {
    const signatures = detectPdfSignatures(input.pdfBuffer).filter(
      (signature) => !signature.isTimestampSignature,
    );
    const evidences: PdfDssEvidence[] = [];
    const statuses: Array<PdfRevocationEvidenceStatus | 'missing'> = [];

    for (const signature of signatures) {
      const parsed = parsePdfCmsSignature(signature.contents);

      if (!parsed) {
        statuses.push('missing');
        continue;
      }

      const evidence = await this.collectForCmsSignature({
        accountId: input.accountId,
        parsed,
      });

      evidences.push(evidence.dssEvidence);
      statuses.push(evidence.status);
    }

    const evidenceStatus = summarizeEvidenceStatuses(statuses);

    return {
      evidences,
      metadata: {
        evidenceStatus,
        ltvRequired: this.config.get<boolean>('PDF_LTV_REQUIRED', false),
      },
    };
  }

  async validateEmbeddedEvidence(input: {
    evidence: ParsedPdfDssEvidence;
    parsed: ParsedPdfCmsSignature;
  }): Promise<PdfRevocationEvidenceStatus | 'missing'> {
    if (!input.evidence.hasMatchingVri) {
      return 'missing';
    }

    const [signer, issuer] = findSignerAndIssuer(input.parsed);

    if (!signer || !issuer) {
      return 'unknown';
    }

    for (const ocsp of input.evidence.ocspResponses) {
      const status = await this.validateOcspEvidence(ocsp, signer, issuer);

      if (status === 'good' || status === 'revoked') {
        return status;
      }
    }

    for (const crl of input.evidence.crlResponses) {
      const status = await this.validateCrlEvidence(crl, signer, issuer);

      if (status === 'good' || status === 'revoked') {
        return status;
      }
    }

    return input.evidence.ocspResponses.length ||
      input.evidence.crlResponses.length
      ? 'unknown'
      : 'missing';
  }

  private async collectForCmsSignature(input: {
    accountId: string;
    parsed: ParsedPdfCmsSignature;
  }): Promise<{
    dssEvidence: PdfDssEvidence;
    status: PdfRevocationEvidenceStatus | 'missing';
  }> {
    const [signer, issuer] = findSignerAndIssuer(input.parsed);
    const certificateDer = input.parsed.certificates.map(certificateToDer);

    if (!signer || !issuer) {
      return {
        dssEvidence: {
          certificateDer,
          crlResponses: [],
          ocspResponses: [],
          vriKey: input.parsed.vriKey,
        },
        status: 'missing',
      };
    }

    const signerDer = certificateToDer(signer);
    const cachedOcsp = await this.evidenceCache.findFresh({
      accountId: input.accountId,
      certificateDer: signerDer,
      evidenceType: 'ocsp',
    });

    if (cachedOcsp?.dataBase64) {
      return {
        dssEvidence: {
          certificateDer,
          crlResponses: [],
          ocspResponses: [Buffer.from(cachedOcsp.dataBase64, 'base64')],
          vriKey: input.parsed.vriKey,
        },
        status: cachedOcsp.status,
      };
    }

    const ocsp = await this.collectOcsp({
      accountId: input.accountId,
      issuer,
      signer,
    });

    if (ocsp.status === 'good' || ocsp.status === 'revoked') {
      return {
        dssEvidence: {
          certificateDer,
          crlResponses: [],
          ocspResponses: ocsp.data ? [ocsp.data] : [],
          vriKey: input.parsed.vriKey,
        },
        status: ocsp.status,
      };
    }

    const crl = await this.collectCrl({
      accountId: input.accountId,
      issuer,
      signer,
    });

    return {
      dssEvidence: {
        certificateDer,
        crlResponses: crl.data ? [crl.data] : [],
        ocspResponses: ocsp.data ? [ocsp.data] : [],
        vriKey: input.parsed.vriKey,
      },
      status: crl.status === 'unavailable' ? ocsp.status : crl.status,
    };
  }

  private async collectOcsp(input: {
    accountId: string;
    issuer: Certificate;
    signer: Certificate;
  }): Promise<CollectedEvidence> {
    const urls = getExtensionHttpUrls(input.signer, '1.3.6.1.5.5.7.1.1');
    const issuerHash = certificateHash(input.issuer);
    const serialNumber = certificateSerial(input.signer);

    for (const url of urls) {
      try {
        const request = new OCSPRequest();
        await request.createForCertificate(input.signer, {
          hashAlgorithm: 'SHA-1',
          issuerCertificate: input.issuer,
        });
        const response = await fetch(url, {
          body: Buffer.from(request.toSchema(true).toBER(false)),
          headers: {
            Accept: 'application/ocsp-response',
            'Content-Type': 'application/ocsp-request',
          },
          method: 'POST',
          signal: AbortSignal.timeout(
            this.config.get<number>('PDF_LTV_HTTP_TIMEOUT_MS', 10_000),
          ),
        });

        if (!response.ok) {
          continue;
        }

        const data = Buffer.from(await response.arrayBuffer());
        const status = await this.validateOcspEvidence(
          data,
          input.signer,
          input.issuer,
        );
        const basic = parseBasicOcspResponse(data);

        await this.evidenceCache.store({
          accountId: input.accountId,
          certificateDer: certificateToDer(input.signer),
          data,
          evidenceType: 'ocsp',
          issuerHash,
          nextUpdate: getOcspNextUpdate(basic),
          serialNumber,
          status,
          thisUpdate: getOcspThisUpdate(basic),
          url,
        });

        return { data, status };
      } catch (error) {
        this.logger.warn(
          `OCSP collection failed for ${url}: ${errorMessage(error)}`,
        );
      }
    }

    return { data: null, status: 'unavailable' };
  }

  private async collectCrl(input: {
    accountId: string;
    issuer: Certificate;
    signer: Certificate;
  }): Promise<CollectedEvidence> {
    const urls = getExtensionHttpUrls(input.signer, '2.5.29.31');
    const issuerHash = certificateHash(input.issuer);
    const serialNumber = certificateSerial(input.signer);

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/pkix-crl,*/*' },
          signal: AbortSignal.timeout(
            this.config.get<number>('PDF_LTV_HTTP_TIMEOUT_MS', 10_000),
          ),
        });

        if (!response.ok) {
          continue;
        }

        const data = Buffer.from(await response.arrayBuffer());
        const status = await this.validateCrlEvidence(
          data,
          input.signer,
          input.issuer,
        );
        const crl = parseCrl(data);

        await this.evidenceCache.store({
          accountId: input.accountId,
          certificateDer: certificateToDer(input.signer),
          data,
          evidenceType: 'crl',
          issuerHash,
          nextUpdate: crl?.nextUpdate?.value ?? null,
          serialNumber,
          status,
          thisUpdate: crl?.thisUpdate.value ?? null,
          url,
        });

        return { data, status };
      } catch (error) {
        this.logger.warn(
          `CRL collection failed for ${url}: ${errorMessage(error)}`,
        );
      }
    }

    return { data: null, status: 'unavailable' };
  }

  private async validateOcspEvidence(
    data: Buffer,
    signer: Certificate,
    issuer: Certificate,
  ): Promise<PdfRevocationEvidenceStatus> {
    const response = parseOcspResponse(data);

    if (!response) {
      return 'unknown';
    }

    try {
      const certificateStatus = await response.getCertificateStatus(
        signer,
        issuer,
      );
      const verified = await response.verify(issuer);

      if (!verified || !certificateStatus.isForCertificate) {
        return 'unknown';
      }

      return certificateStatus.status === 0 ? 'good' : 'revoked';
    } catch {
      return 'unknown';
    }
  }

  private async validateCrlEvidence(
    data: Buffer,
    signer: Certificate,
    issuer: Certificate,
  ): Promise<PdfRevocationEvidenceStatus> {
    const crl = parseCrl(data);

    if (!crl) {
      return 'unknown';
    }

    try {
      const verified = await crl.verify({ issuerCertificate: issuer });

      if (!verified) {
        return 'unknown';
      }

      const signerSerial = certificateSerial(signer);
      const revoked = (crl.revokedCertificates ?? []).some(
        (certificate) =>
          certificate.userCertificate.valueBlock.toString() === signerSerial,
      );

      return revoked ? 'revoked' : 'good';
    } catch {
      return 'unknown';
    }
  }
}

type CollectedEvidence = {
  data: Buffer | null;
  status: PdfRevocationEvidenceStatus;
};

function findSignerAndIssuer(
  parsed: ParsedPdfCmsSignature,
): [Certificate | null, Certificate | null] {
  const signer = parsed.certificates[0] ?? null;
  const issuer =
    signer &&
    parsed.certificates.find(
      (certificate) =>
        formatName(certificate.subject) === formatName(signer.issuer),
    );

  return [signer, issuer || null];
}

function getExtensionHttpUrls(certificate: Certificate, oid: string): string[] {
  const extension = certificate.extensions?.find((item) => item.extnID === oid);

  if (!extension) {
    return [];
  }

  return [...collectHttpUrls(extension.toJSON())];
}

function collectHttpUrls(value: unknown): Set<string> {
  const urls = new Set<string>();

  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    urls.add(value);
    return urls;
  }

  if (!value || typeof value !== 'object') {
    return urls;
  }

  for (const child of Object.values(value)) {
    for (const url of collectHttpUrls(child)) {
      urls.add(url);
    }
  }

  return urls;
}

function parseOcspResponse(data: Buffer): OCSPResponse | null {
  try {
    const asn1 = asn1js.fromBER(toArrayBuffer(data));

    if (asn1.offset === -1) {
      return null;
    }

    return new OCSPResponse({ schema: asn1.result });
  } catch {
    return null;
  }
}

function parseBasicOcspResponse(data: Buffer): BasicOCSPResponse | null {
  const response = parseOcspResponse(data);

  if (!response?.responseBytes?.response) {
    return null;
  }

  if (response.responseBytes.responseType !== id_PKIX_OCSP_Basic) {
    return null;
  }

  const asn1 = asn1js.fromBER(
    response.responseBytes.response.valueBlock.valueHex,
  );

  if (asn1.offset === -1) {
    return null;
  }

  return new BasicOCSPResponse({ schema: asn1.result });
}

function parseCrl(data: Buffer): CertificateRevocationList | null {
  try {
    const asn1 = asn1js.fromBER(toArrayBuffer(data));

    if (asn1.offset === -1) {
      return null;
    }

    return new CertificateRevocationList({ schema: asn1.result });
  } catch {
    return null;
  }
}

function getOcspThisUpdate(response: BasicOCSPResponse | null): Date | null {
  return response?.tbsResponseData.responses[0]?.thisUpdate ?? null;
}

function getOcspNextUpdate(response: BasicOCSPResponse | null): Date | null {
  return response?.tbsResponseData.responses[0]?.nextUpdate ?? null;
}

function certificateHash(certificate: Certificate): string {
  return createHash('sha256')
    .update(certificateToDer(certificate))
    .digest('hex');
}

function certificateSerial(certificate: Certificate): string {
  return certificate.serialNumber.valueBlock.toString();
}

function formatName(name: Certificate['subject']): string {
  return name.typesAndValues
    .map((value) => `${value.type}:${String(value.value.valueBlock.value)}`)
    .join('|');
}

function summarizeEvidenceStatuses(
  statuses: Array<PdfRevocationEvidenceStatus | 'missing'>,
): PdfRevocationEvidenceStatus | 'missing' {
  if (!statuses.length) {
    return 'missing';
  }

  if (statuses.includes('revoked')) {
    return 'revoked';
  }

  if (statuses.every((status) => status === 'good')) {
    return 'good';
  }

  if (statuses.includes('unknown')) {
    return 'unknown';
  }

  if (statuses.includes('unavailable')) {
    return 'unavailable';
  }

  return 'missing';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
