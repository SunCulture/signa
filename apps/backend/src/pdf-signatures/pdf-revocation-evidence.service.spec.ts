import { PdfRevocationEvidence } from './entities/pdf-revocation-evidence.entity';
import { PdfRevocationEvidenceService } from './pdf-revocation-evidence.service';

describe('PdfRevocationEvidenceService', () => {
  const certificateDer = Buffer.from('certificate');

  it('expires evidence without nextUpdate after the bounded fallback TTL', async () => {
    const service = buildService({
      checkedAt: new Date(Date.now() - 6 * 60 * 1000),
      nextUpdate: null,
    });

    await expect(
      service.findFresh({
        accountId: '1',
        certificateDer,
        evidenceType: 'ocsp',
      }),
    ).resolves.toBeNull();
  });

  it('keeps recently checked evidence without nextUpdate reusable', async () => {
    const evidence = {
      checkedAt: new Date(Date.now() - 60 * 1000),
      nextUpdate: null,
    } as PdfRevocationEvidence;
    const service = buildService(evidence);

    await expect(
      service.findFresh({
        accountId: '1',
        certificateDer,
        evidenceType: 'crl',
      }),
    ).resolves.toBe(evidence);
  });

  it('stores portable Base64 evidence payloads', async () => {
    const repository = {
      create: jest.fn((value: Partial<PdfRevocationEvidence>) => value),
      save: jest.fn((value: PdfRevocationEvidence) => Promise.resolve(value)),
    };
    const service = new PdfRevocationEvidenceService(repository as never);

    await service.store({
      accountId: '1',
      certificateDer,
      data: Buffer.from('ocsp-response'),
      evidenceType: 'ocsp',
      issuerHash: 'issuer',
      nextUpdate: null,
      serialNumber: '1',
      status: 'good',
      thisUpdate: new Date(),
      url: 'https://ocsp.example.com',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dataBase64: Buffer.from('ocsp-response').toString('base64'),
      }),
    );
  });
});

function buildService(evidence: Partial<PdfRevocationEvidence>) {
  return new PdfRevocationEvidenceService({
    findOne: jest.fn().mockResolvedValue(evidence),
  } as never);
}
