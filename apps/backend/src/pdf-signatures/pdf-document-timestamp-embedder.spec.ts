import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { PdfiumProcessingService } from '../pdf-processing/pdfium-processing.service';
import { PdfDocumentTimestampEmbedder } from './pdf-document-timestamp-embedder';
import { Rfc3161TimestampClient } from './rfc3161-timestamp-client';

describe('PdfDocumentTimestampEmbedder', () => {
  let embedder: PdfDocumentTimestampEmbedder;
  let config: { get: jest.Mock };
  let timestampClient: {
    requestTimestampToken: jest.Mock;
  };

  beforeEach(async () => {
    config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    };
    timestampClient = {
      requestTimestampToken: jest.fn().mockResolvedValue({
        attempts: [],
        token: null,
        url: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfDocumentTimestampEmbedder,
        {
          provide: ConfigService,
          useValue: config,
        },
        {
          provide: Rfc3161TimestampClient,
          useValue: timestampClient,
        },
      ],
    }).compile();

    embedder = module.get(PdfDocumentTimestampEmbedder);
  });

  it('leaves PDFs untouched when timestamping is not configured', async () => {
    const pdfBuffer = await createPdfBuffer();
    const result = await embedder.embedDocumentTimestamp({
      pdfBuffer,
      timestampServerUrl: null,
    });

    expect(result.buffer).toBe(pdfBuffer);
    expect(result.timestamp).toMatchObject({
      embedded: false,
      status: 'disabled',
      tokenSha256: null,
      url: null,
    });
    expect(timestampClient.requestTimestampToken).not.toHaveBeenCalled();
  });

  it('appends an RFC3161 DocTimeStamp signature dictionary', async () => {
    timestampClient.requestTimestampToken.mockResolvedValueOnce({
      attempts: [{ status: 'success', url: 'https://tsa.example.com' }],
      token: Buffer.from('timestamp-token'),
      url: 'https://tsa.example.com',
    });
    const result = await embedder.embedDocumentTimestamp({
      pdfBuffer: await createPdfBuffer(),
      timestampServerUrl: 'https://tsa.example.com',
    });
    const pdfText = result.buffer.toString('latin1');

    expect(pdfText).toContain('/Type /DocTimeStamp');
    expect(pdfText).toContain('/Filter /Adobe.PPKLite');
    expect(pdfText).toContain('/SubFilter /ETSI.RFC3161');
    expect(pdfText).toContain('/ByteRange [');
    expect(result.timestamp).toMatchObject({
      embedded: true,
      status: 'embedded',
      url: 'https://tsa.example.com',
    });
    expect(typeof result.timestamp.tokenSha256).toBe('string');

    const timestampRequest = lastTimestampRequest(timestampClient);

    expect(timestampRequest.digest).toBeInstanceOf(Buffer);
    expect(timestampRequest.serverUrls).toEqual(['https://tsa.example.com']);

    await expect(PDFDocument.load(result.buffer)).resolves.toBeDefined();
    await expect(
      new PdfiumProcessingService().inspectPdf(result.buffer),
    ).resolves.toBeDefined();
  });

  it('keeps the approval-signed PDF when optional timestamping fails', async () => {
    const pdfBuffer = await createPdfBuffer();
    const result = await embedder.embedDocumentTimestamp({
      pdfBuffer,
      timestampServerUrl: 'https://tsa.example.com',
    });

    expect(result.buffer).toBe(pdfBuffer);
    expect(result.timestamp).toMatchObject({
      embedded: false,
      status: 'failed',
      tokenSha256: null,
    });
  });

  it('fails signing when timestamping is required but unavailable', async () => {
    config.get.mockImplementation((key: string, fallback: unknown) =>
      key === 'PDF_TIMESTAMP_REQUIRED' ? true : fallback,
    );

    await expect(
      embedder.embedDocumentTimestamp({
        pdfBuffer: await createPdfBuffer(),
        timestampServerUrl: 'https://tsa.example.com',
      }),
    ).rejects.toThrow(
      'PDF timestamp is required but no TSA token was returned',
    );
  });
});

async function createPdfBuffer(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 200]);

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

function lastTimestampRequest(timestampClient: {
  requestTimestampToken: jest.Mock;
}): {
  digest: Buffer;
  serverUrls: string[];
} {
  const call: unknown = timestampClient.requestTimestampToken.mock.calls.at(-1);

  if (!Array.isArray(call)) {
    throw new Error('Expected timestamp client to be called');
  }

  const [request] = call as [{ digest: Buffer; serverUrls: string[] }];

  return request;
}
