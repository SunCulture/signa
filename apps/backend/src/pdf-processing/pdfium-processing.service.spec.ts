import { PDFDocument } from 'pdf-lib';
import { PdfiumProcessingService } from './pdfium-processing.service';

describe('PdfiumProcessingService', () => {
  let service: PdfiumProcessingService;

  beforeEach(() => {
    service = new PdfiumProcessingService();
  });

  it('flattens AcroForm widgets and saves a valid PDF copy', async () => {
    const source = await createPdfWithTextField();
    const result = await service.flattenPdf(source);

    expect(result.metadata).toMatchObject({
      formType: 'acro_form',
      hasXfa: false,
      processingMode: 'acro_form',
      xfaLoadStatus: 'not_applicable',
      xfaLoaded: false,
      xfaPacketCount: 0,
      xfaPacketNames: [],
    });
    expect(result.pageCount).toBe(1);
    expect(result.flattenedPages).toBe(1);
    expect(result.buffer.subarray(0, 8).toString('latin1')).toBe('%PDF-1.7');
    await expect(PDFDocument.load(result.buffer)).resolves.toBeDefined();

    const flattened = await PDFDocument.load(result.buffer);
    const page = flattened.getPage(0);
    const annotations = page.node.Annots();

    expect(annotations?.size() ?? 0).toBe(0);
  });

  it('detects ordinary PDF form metadata before preparing form rendering', async () => {
    const source = await createPdfWithTextField();
    const result = await service.inspectPdf(source);

    expect(result).toEqual({
      formType: 'acro_form',
      hasXfa: false,
      processingMode: 'acro_form',
      xfaLoadStatus: 'not_applicable',
      xfaLoaded: false,
      xfaPacketCount: 0,
      xfaPacketNames: [],
    });
  });
});

async function createPdfWithTextField(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 200]);
  const field = pdf.getForm().createTextField('full_name');

  field.setText('Ada Lovelace');
  field.addToPage(page, {
    height: 24,
    width: 160,
    x: 20,
    y: 120,
  });

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}
