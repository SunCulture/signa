import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageBlob } from '../storage/entities/storage-blob.entity';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import { PdfTrustRootService } from '../pdf-signatures/pdf-trust-root.service';
import { PdfSignatureVerifierService } from './pdf-signature-verifier.service';
import { ToolsService } from './tools.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ToolsService', () => {
  let service: ToolsService;
  let completedDocuments: MockRepository<CompletedDocument>;
  let pdfSignatureVerifier: Pick<PdfSignatureVerifierService, 'verify'>;
  let storageAttachments: MockRepository<StorageAttachment>;

  beforeEach(async () => {
    completedDocuments = {
      exists: jest.fn().mockResolvedValue(false),
    };
    pdfSignatureVerifier = {
      verify: jest.fn().mockResolvedValue({
        certificateChain: [],
        certificateChainStatus: 'missing',
        certificatePolicyErrors: [],
        cmsMessageDigestValid: null,
        cmsSignatureValid: null,
        ltvStatus: 'missing',
        messages: [
          'certificate_chain_missing: CMS certificate chain was not found',
          'revocation_evidence_missing: no embedded OCSP or CRL evidence was found',
        ],
        revocationStatus: 'missing',
        trustAnchor: null,
        trustAnchorFingerprint: null,
      }),
    };
    storageAttachments = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsService,
        {
          provide: getRepositoryToken(CompletedDocument),
          useValue: completedDocuments,
        },
        {
          provide: getRepositoryToken(StorageAttachment),
          useValue: storageAttachments,
        },
        {
          provide: PdfSignatureVerifierService,
          useValue: pdfSignatureVerifier,
        },
        {
          provide: PdfTrustRootService,
          useValue: {
            getTrustedCertificates: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get(ToolsService);
  });

  it('returns the checked SHA-256 and verified status for known completed documents', async () => {
    const pdf = await buildPdfBase64();
    const sha256 = createHash('sha256')
      .update(Buffer.from(pdf, 'base64'))
      .digest('base64url');

    completedDocuments.exists?.mockResolvedValueOnce(true);

    await expect(service.verify({ file: pdf })).resolves.toMatchObject({
      checksum_status: 'verified',
      cryptographic_verification: false,
      sha256,
      signatures: [],
    });
  });

  it('returns not_found for unknown or modified PDFs', async () => {
    const pdf = await buildPdfBase64();
    const result = await service.verify({ file: pdf });

    expect(result).toMatchObject({
      checksum_status: 'not_found',
      cryptographic_verification: false,
    });
    expect(typeof result.sha256).toBe('string');
  });

  it('verifies completed storage artifacts when checksum rows are missing', async () => {
    const pdf = await buildPdfBase64();
    const sha256 = createHash('sha256')
      .update(Buffer.from(pdf, 'base64'))
      .digest('base64url');

    storageAttachments.find?.mockResolvedValueOnce([
      {
        blob: {
          contentType: 'application/pdf',
          metadata: { sha256 },
        } as unknown as StorageBlob,
      } as StorageAttachment,
    ]);

    await expect(service.verify({ file: pdf })).resolves.toMatchObject({
      checksum_status: 'verified',
      cryptographic_verification: false,
      sha256,
    });
  });

  it('extracts signer metadata from signed PDF dictionaries', async () => {
    const signedPdf = Buffer.from(
      `%PDF-1.7
1 0 obj
<<
/Type /Sig
/Filter /Adobe.PPKLite
/SubFilter /adbe.pkcs7.detached
/Name (Ada Lovelace)
/M (D:20260622120000+03'00')
/Reason (Signed document)
/ByteRange [0 100 200 300]
/Contents <00>
>>
endobj
trailer
<<>>
%%EOF`,
      'latin1',
    );

    jest.spyOn(PDFDocument, 'load').mockResolvedValueOnce({} as PDFDocument);

    await expect(service.verify(signedPdf)).resolves.toMatchObject({
      signatures: [
        {
          byte_range_valid: false,
          pades_compliant_sub_filter: false,
          signer_name: 'Ada Lovelace',
          signing_reason: 'Signed document',
          signing_time: '2026-06-22T09:00:00.000Z',
          signature_type: 'adbe.pkcs7.detached',
        },
      ],
    });
  });

  it('extracts PAdES signature metadata and ByteRange hashes', async () => {
    const signedPdf = buildSignedPdfFixture({
      signerName: 'Ada Lovelace',
      subFilter: 'ETSI.CAdES.detached',
    });
    const expectedByteRangeSha256 = createHash('sha256')
      .update(
        Buffer.concat([signedPdf.subarray(0, 120), signedPdf.subarray(220)]),
      )
      .digest('base64url');

    jest.spyOn(PDFDocument, 'load').mockResolvedValueOnce({} as PDFDocument);

    await expect(service.verify(signedPdf)).resolves.toMatchObject({
      signatures: [
        {
          byte_range_sha256: expectedByteRangeSha256,
          byte_range_valid: true,
          cms_message_digest_valid: null,
          cms_signature_valid: null,
          ltv_status: 'missing',
          pades_compliant_sub_filter: true,
          revocation_status: 'missing',
          signer_name: 'Ada Lovelace',
          signature_type: 'ETSI.CAdES.detached',
        },
      ],
    });
    expect(lastVerifyInput(pdfSignatureVerifier)).toMatchObject({
      cmsContents: null,
      pdfBuffer: signedPdf,
    });
    expect(lastVerifyInput(pdfSignatureVerifier).signedBytes).toBeInstanceOf(
      Buffer,
    );
  });

  it('detects RFC3161 document timestamp signatures', async () => {
    const timestampedPdf = Buffer.from(
      `%PDF-1.7
1 0 obj
<<
/Type /DocTimeStamp
/Filter /Adobe.PPKLite
/SubFilter /ETSI.RFC3161
/M (D:20260622120000Z)
/ByteRange [0 120 220 60]
/Contents <00>
>>
endobj
trailer
<<>>
%%EOF`,
      'latin1',
    );

    jest.spyOn(PDFDocument, 'load').mockResolvedValueOnce({} as PDFDocument);

    await expect(service.verify(timestampedPdf)).resolves.toMatchObject({
      cryptographic_verification: false,
      signatures: [
        {
          signer_name: 'timestamp authority',
          signing_reason: 'Document timestamp',
          signing_time: '2026-06-22T12:00:00.000Z',
          signature_type: 'ETSI.RFC3161',
          timestamp_signature: true,
        },
      ],
    });
  });

  it('verifies uploaded PDF buffers without requiring base64 JSON payloads', async () => {
    const pdf = await buildPdfBase64();
    const file = Buffer.from(pdf, 'base64');
    const result = await service.verify(file);

    expect(result).toMatchObject({
      checksum_status: 'not_found',
      cryptographic_verification: false,
    });
    expect(typeof result.sha256).toBe('string');
  });

  it('rejects missing verification files with a useful error', async () => {
    await expect(service.verify({})).rejects.toMatchObject({
      response: { error: 'PDF file is required' },
    });
  });
});

async function buildPdfBase64(): Promise<string> {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);

  return Buffer.from(await pdf.save()).toString('base64');
}

function lastVerifyInput(
  verifier: Pick<PdfSignatureVerifierService, 'verify'>,
): {
  cmsContents: Buffer | null;
  pdfBuffer: Buffer;
  signedBytes: Buffer | null;
} {
  const verify = verifier.verify as jest.Mock;
  const call: unknown = verify.mock.calls.at(-1);

  if (!Array.isArray(call) || !call[0] || typeof call[0] !== 'object') {
    throw new Error('PdfSignatureVerifierService.verify was not called');
  }

  return call[0] as {
    cmsContents: Buffer | null;
    pdfBuffer: Buffer;
    signedBytes: Buffer | null;
  };
}

function buildSignedPdfFixture(input: {
  signerName: string;
  subFilter: string;
}): Buffer {
  const prefix = `%PDF-1.7
1 0 obj
<<
/Type /Sig
/Filter /Adobe.PPKLite
/SubFilter /${input.subFilter}
/Name (${input.signerName})
/M (D:20260622120000+03'00')
/Reason (Signed document)
/ByteRange [0 120 220 60]
`;
  const suffix = `
>>
endobj
trailer
<<>>
%%EOF`;
  const placeholderLength = 220 - prefix.length;
  const content = `${prefix}${'0'.repeat(Math.max(0, placeholderLength))}${suffix}`;

  return Buffer.from(content.padEnd(280, '\n'), 'latin1');
}
