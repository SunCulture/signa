import { PDFDocument } from 'pdf-lib';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import { PdfSignatureVerifierService } from '../tools/pdf-signature-verifier.service';
import {
  defaultSigningCertificateKey,
  signingCertificatePrefix,
  signaDefaultCertificateName,
} from './pdf-signature-certificate';
import { detectPdfSignatures } from './pdf-signature-detection';
import { PdfDssVriEmbedder } from './pdf-dss-vri-embedder';
import { PdfRevocationEvidence } from './entities/pdf-revocation-evidence.entity';
import { PdfRevocationEvidenceService } from './pdf-revocation-evidence.service';
import { PdfRevocationCollectorService } from './pdf-revocation-collector.service';
import { PdfSignatureService } from './pdf-signature.service';

describe('Signa PDF LTV flow', () => {
  it('signs generated Signa certificates with verifiable embedded DSS/VRI CRL evidence', async () => {
    const configs = new Map<string, EncryptedConfig>();
    const evidences: PdfRevocationEvidence[] = [];
    const dssVriEmbedder = new PdfDssVriEmbedder();
    const evidenceService = new PdfRevocationEvidenceService({
      create: (value: Partial<PdfRevocationEvidence>) => value,
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((value: PdfRevocationEvidence) => {
        evidences.push(value);
        return Promise.resolve(value);
      }),
    } as never);
    const config = {
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === 'PDF_LTV_REQUIRED') {
          return true;
        }

        return fallback;
      }),
    };
    const revocationCollector = new PdfRevocationCollectorService(
      config as never,
      evidenceService,
    );
    const signingService = new PdfSignatureService(
      {
        create: (value: Partial<EncryptedConfig>) => value,
        findOne: jest.fn(({ where }: { where: { key: string } }) =>
          Promise.resolve(configs.get(where.key) ?? null),
        ),
        remove: jest.fn(),
        save: jest.fn((value: EncryptedConfig) => {
          const saved: EncryptedConfig = {
            ...value,
            accountId: '1',
            id: String(configs.size + 1),
          };

          configs.set(saved.key, saved);

          return Promise.resolve(saved);
        }),
      } as never,
      config as never,
      {} as never,
      {
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
      } as never,
      revocationCollector,
      dssVriEmbedder,
      {
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
      } as never,
    );
    const verifier = new PdfSignatureVerifierService(
      dssVriEmbedder,
      revocationCollector,
    );
    const pdf = await PDFDocument.create();

    pdf.addPage([200, 200]);

    const signed = await signingService.signPdf({
      accountId: '1',
      buffer: Buffer.from(await pdf.save()),
      reason: 'Signed document',
      signerName: 'Ada Lovelace',
      signingTime: new Date('2026-07-04T12:00:00.000Z'),
    });
    const mainSignature = detectPdfSignatures(signed.buffer).find(
      (signature) => !signature.isTimestampSignature,
    );

    expect(signed.ltv).toMatchObject({
      evidenceStatus: 'good',
      ltvRequired: true,
    });
    expect(signed.buffer.toString('latin1')).toContain('/DSS');
    expect(evidences).toHaveLength(1);
    expect(
      configs.has(`${signingCertificatePrefix}${signaDefaultCertificateName}`),
    ).toBe(true);
    expect(configs.has(defaultSigningCertificateKey)).toBe(false);
    expect(mainSignature).toBeDefined();

    const verification = await verifier.verify({
      cmsContents: mainSignature?.contents ?? null,
      pdfBuffer: signed.buffer,
      signedBytes: mainSignature?.byteRange.signedBytes ?? null,
    });

    expect(verification).toMatchObject({
      certificateChainStatus: 'trusted',
      cmsSignatureValid: true,
      ltvStatus: 'valid',
      revocationStatus: 'good',
    });
  });
});
