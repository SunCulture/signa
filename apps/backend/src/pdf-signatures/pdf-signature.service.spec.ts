import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import {
  defaultSigningCertificateKey,
  signingCertificatePrefix,
  signaDefaultCertificateName,
} from './pdf-signature-certificate';
import { PdfSignatureService } from './pdf-signature.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('PdfSignatureService', () => {
  let service: PdfSignatureService;
  let encryptedConfigs: MockRepository<EncryptedConfig>;
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
          accountId: 'account-1',
          id: String(configs.size + 1),
          ...config,
        };

        configs.set(saved.key, saved);

        return Promise.resolve(saved);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfSignatureService,
        {
          provide: getRepositoryToken(EncryptedConfig),
          useValue: encryptedConfigs,
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
    expect(result.buffer.toString('latin1')).toContain('/ByteRange');
    expect(
      configs.has(`${signingCertificatePrefix}${signaDefaultCertificateName}`),
    ).toBe(true);
  });

  it('stores timestamp server URLs', async () => {
    await service.upsertTimestampServerUrl(
      'account-1',
      'https://tsa.example.com',
    );

    await expect(service.getTimestampServerUrl('account-1')).resolves.toBe(
      'https://tsa.example.com',
    );
    expect(configs.has(defaultSigningCertificateKey)).toBe(false);
  });
});
