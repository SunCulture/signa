import { Injectable } from '@nestjs/common';
import {
  BasicOCSPResponse,
  Certificate,
  CertificateRevocationList,
  SignedData,
  SignedDataVerifyError,
} from 'pkijs';
import { PdfDssVriEmbedder } from '../pdf-signatures/pdf-dss-vri-embedder';
import {
  parsePdfCmsSignature,
  toArrayBuffer,
} from '../pdf-signatures/pdf-cms-utils';
import { PdfRevocationCollectorService } from '../pdf-signatures/pdf-revocation-collector.service';

export type PdfCmsCertificate = {
  issuer: string | null;
  serialNumber: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
};

export type PdfCmsVerificationResult = {
  certificateChain: PdfCmsCertificate[];
  certificateChainStatus: 'external' | 'missing' | 'trusted';
  cmsMessageDigestValid: boolean | null;
  cmsSignatureValid: boolean | null;
  messages: string[];
  revocationStatus: 'good' | 'missing' | 'revoked' | 'unavailable' | 'unknown';
  ltvStatus: 'invalid' | 'missing' | 'valid';
};

const signaRootCommonName = 'Signa Root CA';

@Injectable()
export class PdfSignatureVerifierService {
  constructor(
    private readonly dssVriEmbedder: PdfDssVriEmbedder,
    private readonly revocationCollector: PdfRevocationCollectorService,
  ) {}

  async verify(input: {
    cmsContents: Buffer | null;
    pdfBuffer: Buffer;
    signedBytes: Buffer | null;
  }): Promise<PdfCmsVerificationResult> {
    if (!input.cmsContents || !input.signedBytes) {
      return missingCmsResult();
    }

    const parsed = parsePdfCmsSignature(input.cmsContents);

    if (!parsed) {
      return missingCmsResult([
        'cms_parse_failed: PDF signature Contents could not be parsed as CMS SignedData',
      ]);
    }

    const trustedRoots = findSignaTrustRoots(parsed.certificates);
    const chainStatus = getCertificateChainStatus(parsed.certificates);
    const embeddedRevocationStatus = getEmbeddedRevocationStatus(
      parsed.signedData,
    );
    const dssEvidence = this.dssVriEmbedder.read({
      pdfBuffer: input.pdfBuffer,
      vriKey: parsed.vriKey,
    });
    const dssRevocationStatus =
      await this.revocationCollector.validateEmbeddedEvidence({
        evidence: dssEvidence,
        parsed,
      });
    const revocationStatus =
      dssRevocationStatus === 'missing'
        ? embeddedRevocationStatus
        : dssRevocationStatus;
    const ltvStatus = getLtvStatus({
      hasMatchingVri: dssEvidence.hasMatchingVri,
      revocationStatus,
    });

    try {
      const verification = await parsed.signedData.verify({
        checkChain: trustedRoots.length > 0,
        data: toArrayBuffer(input.signedBytes),
        extendedMode: true,
        passedWhenNotRevValues: true,
        signer: 0,
        trustedCerts: trustedRoots,
      });
      const signatureValid = verification.signatureVerified === true;
      const chainTrusted =
        chainStatus === 'trusted' &&
        verification.signerCertificateVerified !== false;

      return {
        certificateChain: parsed.certificates.map(certificateToResponse),
        certificateChainStatus: chainTrusted ? 'trusted' : chainStatus,
        cmsMessageDigestValid: signatureValid,
        cmsSignatureValid: signatureValid,
        messages: [
          signatureValid
            ? 'cms_signature_valid: CMS signature and signed attributes verify against the PDF ByteRange digest'
            : 'cms_signature_invalid: CMS signature verification failed',
          chainTrusted
            ? 'certificate_chain_trusted: signer certificate chains to the embedded Signa Root CA'
            : chainMessage(chainStatus),
          revocationMessage(revocationStatus),
          ltvMessage(ltvStatus),
        ],
        ltvStatus,
        revocationStatus,
      };
    } catch (error) {
      const messages = [
        cmsErrorMessage(error),
        chainMessage(chainStatus),
        revocationMessage(revocationStatus),
        ltvMessage(ltvStatus),
      ];

      return {
        certificateChain: parsed.certificates.map(certificateToResponse),
        certificateChainStatus: chainStatus,
        cmsMessageDigestValid: isMessageDigestFailure(error) ? false : null,
        cmsSignatureValid: false,
        ltvStatus,
        messages,
        revocationStatus,
      };
    }
  }
}

function getEmbeddedRevocationStatus(
  signedData: SignedData,
): PdfCmsVerificationResult['revocationStatus'] {
  const ocspResponses = signedData.ocsps ?? [];
  const crls = (signedData.crls ?? []).filter(
    (crl): crl is CertificateRevocationList =>
      crl instanceof CertificateRevocationList,
  );

  if (!ocspResponses.length && !crls.length) {
    return 'missing';
  }

  if (
    ocspResponses.every((response) => response instanceof BasicOCSPResponse)
  ) {
    return 'good';
  }

  return 'unknown';
}

function findSignaTrustRoots(certificates: Certificate[]): Certificate[] {
  return certificates.filter((certificate) =>
    formatCertificateName(certificate.subject.typesAndValues).includes(
      `CN=${signaRootCommonName}`,
    ),
  );
}

function getCertificateChainStatus(
  certificates: Certificate[],
): PdfCmsVerificationResult['certificateChainStatus'] {
  if (!certificates.length) {
    return 'missing';
  }

  return findSignaTrustRoots(certificates).length ? 'trusted' : 'external';
}

function certificateToResponse(certificate: Certificate): PdfCmsCertificate {
  return {
    issuer: formatCertificateName(certificate.issuer.typesAndValues),
    serialNumber: certificate.serialNumber.valueBlock.toString(),
    subject: formatCertificateName(certificate.subject.typesAndValues),
    validFrom: certificate.notBefore.value.toISOString(),
    validTo: certificate.notAfter.value.toISOString(),
  };
}

function formatCertificateName(
  values: Certificate['subject']['typesAndValues'],
): string {
  return values
    .map((value) => {
      const name = oidToShortName(value.type);
      const text = formatRdnValue(value.value);

      return `${name}=${text}`;
    })
    .join(', ');
}

function formatRdnValue(value: unknown): string {
  if (!value || typeof value !== 'object' || !('valueBlock' in value)) {
    return '';
  }

  const valueBlock = value.valueBlock;

  if (valueBlock && typeof valueBlock === 'object' && 'value' in valueBlock) {
    const raw = valueBlock.value;

    if (
      typeof raw === 'string' ||
      typeof raw === 'number' ||
      typeof raw === 'boolean' ||
      typeof raw === 'bigint'
    ) {
      return String(raw);
    }
  }

  return '';
}

function oidToShortName(oid: string): string {
  switch (oid) {
    case '2.5.4.3':
      return 'CN';
    case '2.5.4.6':
      return 'C';
    case '2.5.4.10':
      return 'O';
    default:
      return oid;
  }
}

function missingCmsResult(
  extraMessages: string[] = [],
): PdfCmsVerificationResult {
  return {
    certificateChain: [],
    certificateChainStatus: 'missing',
    cmsMessageDigestValid: null,
    cmsSignatureValid: null,
    ltvStatus: 'missing',
    messages: [
      ...extraMessages,
      'certificate_chain_missing: CMS certificate chain was not found',
      'revocation_evidence_missing: no embedded OCSP or CRL evidence was found',
      'ltv_missing: no matching DSS/VRI entry was found for this signature',
    ],
    revocationStatus: 'missing',
  };
}

function cmsErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (isMessageDigestFailure(error)) {
    return 'cms_message_digest_invalid: signed messageDigest does not match the PDF ByteRange digest';
  }

  if (error instanceof SignedDataVerifyError) {
    return `cms_signature_invalid: ${message}`;
  }

  return `cms_signature_invalid: ${message}`;
}

function isMessageDigestFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("message digest doesn't match")
  );
}

function chainMessage(
  status: PdfCmsVerificationResult['certificateChainStatus'],
): string {
  if (status === 'trusted') {
    return 'certificate_chain_trusted: CMS chain includes the Signa Root CA certificate';
  }

  if (status === 'external') {
    return 'certificate_chain_external: CMS chain is present but does not chain to the Signa Root CA';
  }

  return 'certificate_chain_missing: CMS certificate chain was not found';
}

function revocationMessage(
  status: PdfCmsVerificationResult['revocationStatus'],
): string {
  switch (status) {
    case 'good':
      return 'revocation_evidence_present: embedded OCSP or CRL evidence was found';
    case 'revoked':
      return 'revocation_evidence_revoked: embedded evidence reports a revoked certificate';
    case 'unknown':
      return 'revocation_evidence_unknown: embedded revocation evidence could not be fully classified';
    case 'missing':
      return 'revocation_evidence_missing: no embedded OCSP or CRL evidence was found';
    case 'unavailable':
      return 'revocation_evidence_unavailable: revocation endpoints could not be reached';
  }
}

function getLtvStatus(input: {
  hasMatchingVri: boolean;
  revocationStatus: PdfCmsVerificationResult['revocationStatus'];
}): PdfCmsVerificationResult['ltvStatus'] {
  if (!input.hasMatchingVri) {
    return 'missing';
  }

  if (input.revocationStatus === 'missing') {
    return 'missing';
  }

  return input.revocationStatus === 'good' ? 'valid' : 'invalid';
}

function ltvMessage(status: PdfCmsVerificationResult['ltvStatus']): string {
  switch (status) {
    case 'valid':
      return 'ltv_valid: matching DSS/VRI revocation evidence validates for this signature';
    case 'invalid':
      return 'ltv_invalid: matching DSS/VRI evidence is present but could not be validated as good';
    case 'missing':
      return 'ltv_missing: no matching DSS/VRI entry was found for this signature';
  }
}
