import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import {
  PdfRevocationEvidence,
  PdfRevocationEvidenceStatus,
  PdfRevocationEvidenceType,
} from './entities/pdf-revocation-evidence.entity';

export type StorePdfRevocationEvidenceInput = {
  accountId: string;
  certificateDer: Buffer;
  data: Buffer | null;
  evidenceType: PdfRevocationEvidenceType;
  issuerHash: string;
  nextUpdate: Date | null;
  serialNumber: string;
  status: PdfRevocationEvidenceStatus;
  thisUpdate: Date | null;
  url: string | null;
};

@Injectable()
export class PdfRevocationEvidenceService {
  constructor(
    @InjectRepository(PdfRevocationEvidence)
    private readonly revocationEvidence: Repository<PdfRevocationEvidence>,
  ) {}

  async findFresh(input: {
    accountId: string;
    certificateDer: Buffer;
    evidenceType: PdfRevocationEvidenceType;
  }): Promise<PdfRevocationEvidence | null> {
    const certificateSha256 = sha256(input.certificateDer);
    const evidence = await this.revocationEvidence.findOne({
      order: { checkedAt: 'DESC' },
      where: {
        accountId: input.accountId,
        certificateSha256,
        evidenceType: input.evidenceType,
      },
    });

    if (!evidence) {
      return null;
    }

    const expiresAt =
      evidence.nextUpdate?.getTime() ??
      evidence.checkedAt.getTime() + evidenceWithoutNextUpdateMaxAgeMs;

    if (expiresAt < Date.now()) {
      return null;
    }

    return evidence;
  }

  async store(
    input: StorePdfRevocationEvidenceInput,
  ): Promise<PdfRevocationEvidence> {
    return this.revocationEvidence.save(
      this.revocationEvidence.create({
        accountId: input.accountId,
        certificateSha256: sha256(input.certificateDer),
        checkedAt: new Date(),
        dataBase64: input.data?.toString('base64') ?? null,
        evidenceType: input.evidenceType,
        issuerHash: input.issuerHash,
        nextUpdate: input.nextUpdate,
        serialNumber: input.serialNumber,
        status: input.status,
        thisUpdate: input.thisUpdate,
        url: input.url,
      }),
    );
  }
}

const evidenceWithoutNextUpdateMaxAgeMs = 5 * 60 * 1000;

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
