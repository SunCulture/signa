import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { PdfjsProcessingService } from '../pdf-processing/pdfjs-processing.service';
import { PdfiumProcessingService } from '../pdf-processing/pdfium-processing.service';
import { StorageAttachment } from './entities/storage-attachment.entity';
import { StorageBlob } from './entities/storage-blob.entity';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('normalizes PostgreSQL bigint record IDs when grouping previews', async () => {
    const preview = {
      id: 202,
      recordId: '101',
    } as unknown as StorageAttachment;
    const attachmentRepository = {
      find: jest.fn().mockResolvedValue([preview]),
    } as unknown as Repository<StorageAttachment>;
    const service = new StorageService(
      {} as Repository<StorageBlob>,
      attachmentRepository,
      new ConfigService(),
      {} as PdfiumProcessingService,
      {} as PdfjsProcessingService,
    );

    const previews = await service.findPreviewAttachmentsByRecordIds([
      101 as unknown as string,
    ]);

    expect(previews.get('101')).toEqual([preview]);
  });
});
