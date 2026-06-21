import { zipSync, strToU8 } from 'fflate';
import { DocxFieldTagService } from './docx-field-tag.service';

describe('DocxFieldTagService', () => {
  let service: DocxFieldTagService;

  beforeEach(() => {
    service = new DocxFieldTagService();
  });

  it('extracts DocuSeal-style DOCX field tags into marker fields', () => {
    const prepared = service.prepareDocument(
      createDocx(
        '<w:document><w:body><w:p><w:r><w:t>{{Signature;role=Signer;type=signature;required=true}}</w:t></w:r></w:p></w:body></w:document>',
      ),
    );

    expect(prepared.markers).toHaveLength(1);
    expect(prepared.markers[0]?.marker).toBe('SIGNATAG0001');
    expect(prepared.markers[0]?.field).toMatchObject({
      name: 'Signature',
      required: true,
      role: 'Signer',
      type: 'signature',
    });
    expect(prepared.buffer.toString('base64')).not.toContain('Signature;role');
  });
});

function createDocx(documentXml: string): Buffer {
  return Buffer.from(
    zipSync({
      '[Content_Types].xml': strToU8('<Types></Types>'),
      'word/document.xml': strToU8(documentXml),
    }),
  );
}
