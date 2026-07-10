import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PdfjsProcessingService } from '../../pdf-processing/pdfjs-processing.service';
import { PdfXfaFormService } from './pdf-xfa-form.service';

describe('PdfXfaFormService', () => {
  let service: PdfXfaFormService;

  beforeEach(() => {
    service = new PdfXfaFormService(new PdfjsProcessingService());
  });

  it('extracts editable XFA controls as template fields', async () => {
    const buffer = await readFile(
      join(__dirname, '../../pdf-processing/__fixtures__/xfa-example.pdf'),
    );

    const fields = await service.extractFields(buffer, 'attachment-uuid');
    const names = fields.map((field) => field.name);

    expect(fields.length).toBeGreaterThanOrEqual(10);
    expect(names).toContain('Date:');
    expect(names).toContain('Customer Name:');
    expect(names).toContain('Address:');
    expect(names).toContain('Phone:');
    expect(fields.find((field) => field.name === 'Date:')?.type).toBe('date');
    expect(fields.find((field) => field.name === 'Phone:')?.type).toBe('phone');
    expect(fields.some((field) => field.preferences?.multiline === true)).toBe(
      true,
    );

    for (const field of fields) {
      expect(field.uuid).toEqual(expect.any(String));
      expect(field.areas).toHaveLength(1);
      expect(field.areas?.[0]).toMatchObject({
        attachment_uuid: 'attachment-uuid',
        page: 0,
      });
      expect(field.areas?.[0]?.x).toBeGreaterThanOrEqual(0);
      expect(field.areas?.[0]?.y).toBeGreaterThanOrEqual(0);
      expect(field.areas?.[0]?.w).toBeGreaterThan(0);
      expect(field.areas?.[0]?.h).toBeGreaterThan(0);
    }
  });
});
