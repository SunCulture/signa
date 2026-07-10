import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfjsProcessingService } from './pdfjs-processing.service';

describe('PdfjsProcessingService', () => {
  let service: PdfjsProcessingService;

  beforeEach(() => {
    service = new PdfjsProcessingService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('renders preview pixels from a normal PDF', async () => {
    const source = await createPdf();
    const pages = await service.renderPagePreviews(source, {
      maxPages: 1,
      maxWidth: 400,
    });

    expect(pages).toHaveLength(1);
    expect(pages[0].width).toBeGreaterThan(0);
    expect(pages[0].height).toBeGreaterThan(0);
    expect(pages[0].data.byteLength).toBe(pages[0].width * pages[0].height * 4);
  });

  it('rasterizes a PDF into a normal PDF document', async () => {
    const source = await createPdf();
    const result = await service.rasterizePdf(source, { scale: 1.5 });
    const pdf = await PDFDocument.load(result.buffer);

    expect(result.pageCount).toBe(1);
    expect(pdf.getPageCount()).toBe(1);
    expect(result.buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.7');
  });

  it('can rasterize the local XFA fixture when present', async () => {
    const source = await readFile(
      join(__dirname, '__fixtures__', 'xfa-example.pdf'),
    );
    const result = await service.rasterizePdf(source, { scale: 1.5 });
    const pdf = await PDFDocument.load(result.buffer);

    expect(result.pageCount).toBeGreaterThan(0);
    expect(pdf.getPageCount()).toBe(result.pageCount);
    expect(result.buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.7');
  });
});

async function createPdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 200]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawText('Signa PDF.js rendering test', {
    font,
    size: 16,
    x: 24,
    y: 120,
  });

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
