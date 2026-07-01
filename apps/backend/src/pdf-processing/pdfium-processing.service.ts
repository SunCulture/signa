import type { WrappedPdfiumModule } from '@embedpdf/pdfium';
import { init } from '@embedpdf/pdfium';
import { Injectable, Logger } from '@nestjs/common';

export type PdfiumFlattenResult = {
  buffer: Buffer;
  flattenedPages: number;
  pageCount: number;
};

export type PdfiumRenderedPage = {
  data: Buffer;
  width: number;
  height: number;
};

type PdfiumModuleWithMemory = WrappedPdfiumModule & {
  pdfium: WrappedPdfiumModule['pdfium'] & {
    HEAPU8: Uint8Array;
  };
};

type LoadedPdfDocument = {
  documentPointer: number;
  inputPointer: number;
  inputSize: number;
};

type PdfiumFormContext = {
  formFillInfoPointer: number;
  formHandlePointer: number;
};

const flattenNormalDisplay = 0;
const flattenFailure = 0;
const flattenSuccess = 1;
const bitmapBgraFormat = 1;
const renderAnnotations = 0x01;
const renderLcdText = 0x02;
const whiteArgb = 0xffffffff;

@Injectable()
export class PdfiumProcessingService {
  private readonly logger = new Logger(PdfiumProcessingService.name);
  private pdfiumPromise: Promise<PdfiumModuleWithMemory> | null = null;

  async flattenPdf(buffer: Buffer): Promise<PdfiumFlattenResult> {
    const pdfium = await this.getPdfium();
    const document = this.loadDocument(pdfium, buffer);
    let formContext: PdfiumFormContext | null = null;

    try {
      formContext = this.openFormContext(pdfium, document.documentPointer);
      const pageCount = pdfium.FPDF_GetPageCount(document.documentPointer);
      const flattenedPages = this.flattenPages(
        pdfium,
        document.documentPointer,
        formContext.formHandlePointer,
        pageCount,
      );

      return {
        buffer: this.saveDocument(pdfium, document.documentPointer),
        flattenedPages,
        pageCount,
      };
    } finally {
      this.closeFormContext(pdfium, formContext);
      this.closeDocument(pdfium, document);
    }
  }

  async renderPagePreviews(
    buffer: Buffer,
    options: { maxPages: number; maxWidth: number },
  ): Promise<PdfiumRenderedPage[]> {
    const pdfium = await this.getPdfium();
    const document = this.loadDocument(pdfium, buffer);
    let formContext: PdfiumFormContext | null = null;

    try {
      formContext = this.openFormContext(pdfium, document.documentPointer);
      const pageCount = pdfium.FPDF_GetPageCount(document.documentPointer);
      const renderCount = Math.min(pageCount, options.maxPages);
      const renderedPages: PdfiumRenderedPage[] = [];

      for (let pageIndex = 0; pageIndex < renderCount; pageIndex += 1) {
        renderedPages.push(
          this.renderPagePreview(
            pdfium,
            document.documentPointer,
            formContext.formHandlePointer,
            pageIndex,
            options.maxWidth,
          ),
        );
      }

      return renderedPages;
    } finally {
      this.closeFormContext(pdfium, formContext);
      this.closeDocument(pdfium, document);
    }
  }

  private async getPdfium(): Promise<PdfiumModuleWithMemory> {
    this.pdfiumPromise ??= this.initializePdfium();

    return this.pdfiumPromise;
  }

  private async initializePdfium(): Promise<PdfiumModuleWithMemory> {
    const pdfium = (await init({})) as PdfiumModuleWithMemory;

    pdfium.PDFiumExt_Init();

    return pdfium;
  }

  private loadDocument(
    pdfium: PdfiumModuleWithMemory,
    buffer: Buffer,
  ): LoadedPdfDocument {
    const inputPointer = pdfium.pdfium.wasmExports.malloc(buffer.byteLength);

    pdfium.pdfium.HEAPU8.set(buffer, inputPointer);

    const documentPointer = pdfium.FPDF_LoadMemDocument(
      inputPointer,
      buffer.byteLength,
      '',
    );

    if (!documentPointer) {
      pdfium.pdfium.wasmExports.free(inputPointer);
      throw new Error('PDFium failed to load PDF bytes');
    }

    return {
      documentPointer,
      inputPointer,
      inputSize: buffer.byteLength,
    };
  }

  private openFormContext(
    pdfium: PdfiumModuleWithMemory,
    documentPointer: number,
  ): PdfiumFormContext {
    const formFillInfoPointer = pdfium.PDFiumExt_OpenFormFillInfo();

    if (!formFillInfoPointer) {
      throw new Error('PDFium failed to open form-fill info');
    }

    const formHandlePointer = pdfium.PDFiumExt_InitFormFillEnvironment(
      documentPointer,
      formFillInfoPointer,
    );

    if (!formHandlePointer) {
      pdfium.PDFiumExt_CloseFormFillInfo(formFillInfoPointer);
      throw new Error('PDFium failed to initialize form-fill environment');
    }

    return { formFillInfoPointer, formHandlePointer };
  }

  private flattenPages(
    pdfium: PdfiumModuleWithMemory,
    documentPointer: number,
    formHandlePointer: number,
    pageCount: number,
  ): number {
    let flattenedPages = 0;

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      flattenedPages += this.flattenPage(
        pdfium,
        documentPointer,
        formHandlePointer,
        pageIndex,
      );
    }

    return flattenedPages;
  }

  private flattenPage(
    pdfium: PdfiumModuleWithMemory,
    documentPointer: number,
    formHandlePointer: number,
    pageIndex: number,
  ): number {
    const pagePointer = pdfium.FPDF_LoadPage(documentPointer, pageIndex);

    if (!pagePointer) {
      throw new Error(`PDFium failed to load page ${pageIndex + 1}`);
    }

    try {
      pdfium.FORM_OnAfterLoadPage(pagePointer, formHandlePointer);
      this.generatePageContent(pdfium, pagePointer, pageIndex);

      const flattenResult = pdfium.FPDFPage_Flatten(
        pagePointer,
        flattenNormalDisplay,
      );

      if (flattenResult === flattenFailure) {
        throw new Error(`PDFium failed to flatten page ${pageIndex + 1}`);
      }

      this.generatePageContent(pdfium, pagePointer, pageIndex);

      return flattenResult === flattenSuccess ? 1 : 0;
    } finally {
      pdfium.FORM_OnBeforeClosePage(pagePointer, formHandlePointer);
      pdfium.FPDF_ClosePage(pagePointer);
    }
  }

  private renderPagePreview(
    pdfium: PdfiumModuleWithMemory,
    documentPointer: number,
    formHandlePointer: number,
    pageIndex: number,
    maxWidth: number,
  ): PdfiumRenderedPage {
    const pagePointer = pdfium.FPDF_LoadPage(documentPointer, pageIndex);

    if (!pagePointer) {
      throw new Error(`PDFium failed to load page ${pageIndex + 1}`);
    }

    let bitmapPointer = 0;

    try {
      pdfium.FORM_OnAfterLoadPage(pagePointer, formHandlePointer);

      const pageWidth = pdfium.FPDF_GetPageWidthF(pagePointer);
      const pageHeight = pdfium.FPDF_GetPageHeightF(pagePointer);
      const scale = maxWidth / pageWidth;
      const width = Math.max(1, Math.round(pageWidth * scale));
      const height = Math.max(1, Math.round(pageHeight * scale));

      bitmapPointer = pdfium.FPDFBitmap_Create(width, height, bitmapBgraFormat);

      if (!bitmapPointer) {
        throw new Error(
          `PDFium failed to allocate page ${pageIndex + 1} bitmap`,
        );
      }

      pdfium.FPDFBitmap_FillRect(bitmapPointer, 0, 0, width, height, whiteArgb);
      pdfium.FPDF_RenderPageBitmap(
        bitmapPointer,
        pagePointer,
        0,
        0,
        width,
        height,
        0,
        renderAnnotations | renderLcdText,
      );

      return {
        data: this.readBitmapRgba(pdfium, bitmapPointer),
        width,
        height,
      };
    } finally {
      if (bitmapPointer) {
        pdfium.FPDFBitmap_Destroy(bitmapPointer);
      }

      pdfium.FORM_OnBeforeClosePage(pagePointer, formHandlePointer);
      pdfium.FPDF_ClosePage(pagePointer);
    }
  }

  private saveDocument(
    pdfium: PdfiumModuleWithMemory,
    documentPointer: number,
  ): Buffer {
    const writerPointer = pdfium.PDFiumExt_OpenFileWriter();

    if (!writerPointer) {
      throw new Error('PDFium failed to open output writer');
    }

    try {
      const saved = pdfium.PDFiumExt_SaveAsCopy(documentPointer, writerPointer);

      if (!saved) {
        throw new Error('PDFium failed to save flattened PDF');
      }

      return this.readWriterData(pdfium, writerPointer);
    } finally {
      pdfium.PDFiumExt_CloseFileWriter(writerPointer);
    }
  }

  private readWriterData(
    pdfium: PdfiumModuleWithMemory,
    writerPointer: number,
  ): Buffer {
    const outputSize = pdfium.PDFiumExt_GetFileWriterSize(writerPointer);

    if (outputSize <= 0) {
      throw new Error('PDFium produced an empty output PDF');
    }

    const outputPointer = pdfium.pdfium.wasmExports.malloc(outputSize);

    try {
      const bytesRead = pdfium.PDFiumExt_GetFileWriterData(
        writerPointer,
        outputPointer,
        outputSize,
      );

      if (bytesRead <= 0) {
        throw new Error('PDFium failed to read flattened PDF output');
      }

      return Buffer.from(
        pdfium.pdfium.HEAPU8.subarray(outputPointer, outputPointer + bytesRead),
      );
    } finally {
      pdfium.pdfium.wasmExports.free(outputPointer);
    }
  }

  private closeFormContext(
    pdfium: PdfiumModuleWithMemory,
    formContext: PdfiumFormContext | null,
  ): void {
    if (!formContext) {
      return;
    }

    pdfium.PDFiumExt_ExitFormFillEnvironment(formContext.formHandlePointer);
    pdfium.PDFiumExt_CloseFormFillInfo(formContext.formFillInfoPointer);
  }

  private closeDocument(
    pdfium: PdfiumModuleWithMemory,
    document: LoadedPdfDocument,
  ): void {
    pdfium.FPDF_CloseDocument(document.documentPointer);
    pdfium.pdfium.wasmExports.free(document.inputPointer);
    this.logger.debug(`Released PDFium input buffer (${document.inputSize}b)`);
  }

  private generatePageContent(
    pdfium: PdfiumModuleWithMemory,
    pagePointer: number,
    pageIndex: number,
  ): void {
    const generated = pdfium.FPDFPage_GenerateContent(pagePointer);

    if (!generated) {
      throw new Error(
        `PDFium failed to regenerate page ${pageIndex + 1} content`,
      );
    }
  }

  private readBitmapRgba(
    pdfium: PdfiumModuleWithMemory,
    bitmapPointer: number,
  ): Buffer {
    const width = pdfium.FPDFBitmap_GetWidth(bitmapPointer);
    const height = pdfium.FPDFBitmap_GetHeight(bitmapPointer);
    const stride = pdfium.FPDFBitmap_GetStride(bitmapPointer);
    const bufferPointer = pdfium.FPDFBitmap_GetBuffer(bitmapPointer);
    const output = Buffer.alloc(width * height * 4);

    for (let row = 0; row < height; row += 1) {
      const sourceRow = bufferPointer + row * stride;
      const targetRow = row * width * 4;

      for (let column = 0; column < width; column += 1) {
        const sourceOffset = sourceRow + column * 4;
        const targetOffset = targetRow + column * 4;
        const blue = pdfium.pdfium.HEAPU8[sourceOffset] ?? 0;
        const green = pdfium.pdfium.HEAPU8[sourceOffset + 1] ?? 0;
        const red = pdfium.pdfium.HEAPU8[sourceOffset + 2] ?? 0;
        const alpha = pdfium.pdfium.HEAPU8[sourceOffset + 3] ?? 255;

        output[targetOffset] = red;
        output[targetOffset + 1] = green;
        output[targetOffset + 2] = blue;
        output[targetOffset + 3] = alpha;
      }
    }

    return output;
  }
}
