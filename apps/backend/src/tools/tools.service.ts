import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { Repository } from 'typeorm';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import {
  MergePdfsDto,
  MergePdfsResponseDto,
  VerifyPdfDto,
  VerifyPdfResponseDto,
} from './dto/tools.dto';

@Injectable()
export class ToolsService {
  constructor(
    @InjectRepository(CompletedDocument)
    private readonly completedDocuments: Repository<CompletedDocument>,
  ) {}

  async merge(input: MergePdfsDto): Promise<MergePdfsResponseDto> {
    const merged = await PDFDocument.create();

    for (const file of input.files) {
      const source = await this.loadPdf(file);
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }

    return {
      data: Buffer.from(await merged.save()).toString('base64'),
    };
  }

  async verify(input: VerifyPdfDto): Promise<VerifyPdfResponseDto> {
    const file = Buffer.from(input.file, 'base64');

    try {
      await PDFDocument.load(file, { ignoreEncryption: true });
    } catch {
      throw new UnprocessableEntityException({ error: 'Malformed PDF' });
    }

    const checksum = createHash('sha256').update(file).digest('base64url');
    const isChecksumFound = await this.completedDocuments.exists({
      where: { sha256: checksum },
    });

    return {
      checksum_status: isChecksumFound ? 'verified' : 'not_found',
      signatures: [],
    };
  }

  private async loadPdf(base64: string): Promise<PDFDocument> {
    try {
      return await PDFDocument.load(Buffer.from(base64, 'base64'), {
        ignoreEncryption: true,
      });
    } catch {
      throw new UnprocessableEntityException({ error: 'Malformed PDF' });
    }
  }
}
