import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import {
  defaultSigningCertificateKey,
  signingCertificatePrefix,
  signaDefaultCertificateName,
} from './pdf-signature-certificate';
import { PdfDssVriEmbedder } from './pdf-dss-vri-embedder';
import { PdfDocumentTimestampEmbedder } from './pdf-document-timestamp-embedder';
import { PdfAService } from './pdf-a.service';
import { PdfRevocationCollectorService } from './pdf-revocation-collector.service';
import { PdfSignatureService } from './pdf-signature.service';
import { Rfc3161TimestampClient } from './rfc3161-timestamp-client';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('PdfSignatureService', () => {
  let service: PdfSignatureService;
  let config: { get: jest.Mock };
  let encryptedConfigs: MockRepository<EncryptedConfig>;
  let timestampClient: {
    assertTimestampServerWorks: jest.Mock;
    requestTimestampToken: jest.Mock;
  };
  let timestampEmbedder: {
    embedDocumentTimestamp: jest.Mock;
  };
  let revocationCollector: {
    collectForSignedPdf: jest.Mock;
  };
  let dssVriEmbedder: {
    embed: jest.Mock;
  };
  let pdfAService: {
    convertBeforeSigning: jest.Mock;
  };
  const configs = new Map<string, EncryptedConfig>();

  beforeEach(async () => {
    configs.clear();
    encryptedConfigs = {
      create: jest.fn((input: Partial<EncryptedConfig>) => input),
      findOne: jest.fn(({ where }: { where: { key: string } }) =>
        Promise.resolve(configs.get(where.key) ?? null),
      ),
      remove: jest.fn((config: EncryptedConfig) => {
        configs.delete(config.key);
        return Promise.resolve(config);
      }),
      save: jest.fn((config: EncryptedConfig) => {
        const saved = {
          ...config,
          accountId: 'account-1',
          id: String(configs.size + 1),
        };

        configs.set(saved.key, saved);

        return Promise.resolve(saved);
      }),
    };
    config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    };
    timestampClient = {
      assertTimestampServerWorks: jest.fn().mockResolvedValue(undefined),
      requestTimestampToken: jest.fn().mockResolvedValue({
        attempts: [],
        token: null,
        url: null,
      }),
    };
    timestampEmbedder = {
      embedDocumentTimestamp: jest.fn(
        (input: { pdfBuffer: Buffer; timestampServerUrl: string | null }) =>
          Promise.resolve({
            buffer: input.pdfBuffer,
            timestamp: {
              attempts: [],
              embedded: false,
              required: false,
              status: 'disabled',
              tokenSha256: null,
              url: null,
            },
          }),
      ),
    };
    revocationCollector = {
      collectForSignedPdf: jest.fn().mockResolvedValue({
        evidences: [],
        metadata: {
          evidenceStatus: 'missing',
          ltvRequired: false,
        },
      }),
    };
    dssVriEmbedder = {
      embed: jest.fn(
        (input: { evidences: unknown[]; pdfBuffer: Buffer }) => input.pdfBuffer,
      ),
    };
    pdfAService = {
      convertBeforeSigning: jest.fn((buffer: Buffer) =>
        Promise.resolve({
          buffer,
          metadata: {
            conversionStatus: 'disabled',
            enabled: false,
            error: null,
            level: '2b',
            required: false,
            validationStatus: 'disabled',
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfSignatureService,
        {
          provide: getRepositoryToken(EncryptedConfig),
          useValue: encryptedConfigs,
        },
        {
          provide: ConfigService,
          useValue: config,
        },
        {
          provide: Rfc3161TimestampClient,
          useValue: timestampClient,
        },
        {
          provide: PdfDocumentTimestampEmbedder,
          useValue: timestampEmbedder,
        },
        {
          provide: PdfRevocationCollectorService,
          useValue: revocationCollector,
        },
        {
          provide: PdfDssVriEmbedder,
          useValue: dssVriEmbedder,
        },
        {
          provide: PdfAService,
          useValue: pdfAService,
        },
      ],
    }).compile();

    service = module.get(PdfSignatureService);
  });

  it('generates a default certificate and signs PDF bytes', async () => {
    const pdf = await PDFDocument.create();

    pdf.addPage([200, 200]);

    const result = await service.signPdf({
      accountId: 'account-1',
      buffer: Buffer.from(await pdf.save()),
      contactInfo: 'ada@example.com',
      reason: 'Signed document',
      signerName: 'Ada Lovelace',
      signingTime: new Date('2026-06-22T00:00:00.000Z'),
    });

    expect(result.signed).toBe(true);
    expect(result.certificateName).toBe(signaDefaultCertificateName);
    expect(result.signatureSubFilter).toBe('ETSI.CAdES.detached');
    expect(result.timestamp.status).toBe('disabled');
    expect(result.ltv).toMatchObject({
      evidenceStatus: 'missing',
      ltvRequired: false,
    });
    expect(result.buffer.toString('latin1')).toContain('/ByteRange');
    expect(result.buffer.toString('latin1')).toContain(
      '/SubFilter /ETSI.CAdES.detached',
    );
    expect(
      configs.has(`${signingCertificatePrefix}${signaDefaultCertificateName}`),
    ).toBe(true);
  });

  it('can use the legacy Adobe detached SubFilter when configured', async () => {
    config.get.mockReturnValueOnce('adobe');
    const pdf = await PDFDocument.create();

    pdf.addPage([200, 200]);

    const result = await service.signPdf({
      accountId: 'account-1',
      buffer: Buffer.from(await pdf.save()),
      reason: 'Signed document',
      signerName: 'Ada Lovelace',
    });

    expect(result.signatureSubFilter).toBe('adbe.pkcs7.detached');
    expect(result.buffer.toString('latin1')).toContain(
      '/SubFilter /adbe.pkcs7.detached',
    );
  });

  it('stores timestamp server URLs', async () => {
    await service.upsertTimestampServerUrl(
      'account-1',
      'https://tsa.example.com',
    );

    await expect(service.getTimestampServerUrl('account-1')).resolves.toBe(
      'https://tsa.example.com',
    );
    expect(timestampClient.assertTimestampServerWorks).toHaveBeenCalledWith(
      'https://tsa.example.com',
    );
    expect(configs.has(defaultSigningCertificateKey)).toBe(false);
  });

  it('delegates optional DocTimeStamp embedding when a TSA URL is configured', async () => {
    timestampEmbedder.embedDocumentTimestamp.mockImplementationOnce(
      (input: { pdfBuffer: Buffer; timestampServerUrl: string | null }) =>
        Promise.resolve({
          buffer: Buffer.concat([
            input.pdfBuffer,
            Buffer.from('\n/Type /DocTimeStamp\n', 'latin1'),
          ]),
          timestamp: {
            attempts: [{ status: 'success', url: 'https://tsa.example.com' }],
            embedded: true,
            required: false,
            status: 'embedded',
            tokenSha256: 'sha256-token',
            url: 'https://tsa.example.com',
          },
        }),
    );
    await service.upsertTimestampServerUrl(
      'account-1',
      'https://tsa.example.com',
    );
    const pdf = await PDFDocument.create();

    pdf.addPage([200, 200]);

    const result = await service.signPdf({
      accountId: 'account-1',
      buffer: Buffer.from(await pdf.save()),
      reason: 'Signed document',
      signerName: 'Ada Lovelace',
    });

    const timestampRequest = lastTimestampEmbedRequest(timestampEmbedder);

    expect(timestampRequest.pdfBuffer).toBeInstanceOf(Buffer);
    expect(timestampRequest.timestampServerUrl).toBe('https://tsa.example.com');
    expect(result.timestamp.status).toBe('embedded');
    expect(result.timestamp.embedded).toBe(true);
    expect(result.buffer.toString('latin1')).toContain('/Type /DocTimeStamp');
  });
});

function lastTimestampEmbedRequest(timestampEmbedder: {
  embedDocumentTimestamp: jest.Mock;
}): {
  pdfBuffer: Buffer;
  timestampServerUrl: string | null;
} {
  const call: unknown =
    timestampEmbedder.embedDocumentTimestamp.mock.calls.at(-1);

  if (!Array.isArray(call)) {
    throw new Error('Expected timestamp embedder to be called');
  }

  const [request] = call as [
    {
      pdfBuffer: Buffer;
      timestampServerUrl: string | null;
    },
  ];

  return request;
}
