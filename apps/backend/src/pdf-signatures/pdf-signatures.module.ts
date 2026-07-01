import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import { PdfRevocationEvidence } from './entities/pdf-revocation-evidence.entity';
import { PdfDssVriEmbedder } from './pdf-dss-vri-embedder';
import { PdfDocumentTimestampEmbedder } from './pdf-document-timestamp-embedder';
import { PdfRevocationCollectorService } from './pdf-revocation-collector.service';
import { PdfRevocationEvidenceService } from './pdf-revocation-evidence.service';
import { PdfSignatureService } from './pdf-signature.service';
import { Rfc3161TimestampClient } from './rfc3161-timestamp-client';

@Module({
  imports: [TypeOrmModule.forFeature([EncryptedConfig, PdfRevocationEvidence])],
  providers: [
    PdfSignatureService,
    PdfDssVriEmbedder,
    PdfDocumentTimestampEmbedder,
    PdfRevocationCollectorService,
    PdfRevocationEvidenceService,
    Rfc3161TimestampClient,
  ],
  exports: [PdfDssVriEmbedder, PdfRevocationCollectorService, PdfSignatureService],
})
export class PdfSignaturesModule {}
