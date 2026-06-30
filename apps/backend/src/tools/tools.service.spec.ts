import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageBlob } from '../storage/entities/storage-blob.entity';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import { ToolsService } from './tools.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ToolsService', () => {
  let service: ToolsService;
  let completedDocuments: MockRepository<CompletedDocument>;
  let storageAttachments: MockRepository<StorageAttachment>;

  beforeEach(async () => {
    completedDocuments = {
      exists: jest.fn().mockResolvedValue(false),
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
          signing_time: "20260622120000+03'00'",
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
          pades_compliant_sub_filter: true,
          signer_name: 'Ada Lovelace',
          signature_type: 'ETSI.CAdES.detached',
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
