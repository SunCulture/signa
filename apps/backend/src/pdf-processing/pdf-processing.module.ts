import { Module } from '@nestjs/common';
import { PdfiumProcessingService } from './pdfium-processing.service';

@Module({
  providers: [PdfiumProcessingService],
  exports: [PdfiumProcessingService],
})
export class PdfProcessingModule {}
