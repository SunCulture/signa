import { PDFDocument, TextAlignment } from 'pdf-lib';
import { PdfAcroFormService } from './pdf-acro-form.service';

describe('PdfAcroFormService', () => {
  let service: PdfAcroFormService;

  beforeEach(() => {
    service = new PdfAcroFormService();
  });

  it('extracts standard AcroForm fields with normalized DocuSeal areas', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([600, 800]);
    const form = document.getForm();

    const text = form.createTextField('Legal Name');
    text.enableRequired();
    text.setAlignment(TextAlignment.Center);
    text.addToPage(page, {
      x: 60,
      y: 720,
      width: 240,
      height: 24,
    });

    const checkbox = form.createCheckBox('Accept Terms');
    checkbox.addToPage(page, {
      x: 60,
      y: 660,
      width: 20,
      height: 20,
    });

    const pdf = Buffer.from(await document.save());

    const fields = await service.extractFields(pdf, 'attachment-uuid');
    const legalName = fields.find((field) => field.name === 'Legal Name');
    const acceptTerms = fields.find((field) => field.name === 'Accept Terms');

    expect(legalName).toMatchObject({
      type: 'text',
      required: true,
      areas: [
        expect.objectContaining({
          attachment_uuid: 'attachment-uuid',
          page: 0,
        }),
      ],
    });
    expect(legalName?.preferences).toMatchObject({ align: 'center' });
    expect(legalName?.areas?.[0]?.x).toBeCloseTo(0.1, 1);
    expect(legalName?.areas?.[0]?.y).toBeCloseTo(0.07, 1);
    expect(legalName?.areas?.[0]?.w).toBeCloseTo(0.4, 1);
    expect(legalName?.areas?.[0]?.h).toBeCloseTo(0.03, 1);

    expect(acceptTerms).toMatchObject({
      type: 'checkbox',
      areas: [
        expect.objectContaining({
          attachment_uuid: 'attachment-uuid',
          page: 0,
        }),
      ],
    });
  });

  it('skips fields with preset values like DocuSeal', async () => {
    const document = await PDFDocument.create();
    const page = document.addPage([600, 800]);
    const form = document.getForm();
    const text = form.createTextField('Prefilled Name');

    text.setText('Ada');
    text.addToPage(page, {
      x: 60,
      y: 720,
      width: 240,
      height: 24,
    });

    await expect(
      service.extractFields(Buffer.from(await document.save()), 'attachment'),
    ).resolves.toEqual([]);
  });
});
