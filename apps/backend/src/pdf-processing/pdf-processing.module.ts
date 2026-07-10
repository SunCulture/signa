import { Module } from '@nestjs/common';
import { PdfjsProcessingService } from './pdfjs-processing.service';
import { PdfiumProcessingService } from './pdfium-processing.service';

@Module({
  providers: [PdfiumProcessingService, PdfjsProcessingService],
  exports: [PdfiumProcessingService, PdfjsProcessingService],
})
export class PdfProcessingModule {}
