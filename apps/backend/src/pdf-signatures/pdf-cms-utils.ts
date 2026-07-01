import { createHash } from 'node:crypto';
import * as asn1js from 'asn1js';
import { Certificate, ContentInfo, SignedData } from 'pkijs';

export type ParsedPdfCmsSignature = {
  certificates: Certificate[];
  cmsContents: Buffer;
  signedData: SignedData;
  vriKey: string;
};

export function parsePdfCmsSignature(
  contents: Buffer | null,
): ParsedPdfCmsSignature | null {
  if (!contents) {
    return null;
  }

  try {
    const cms = trimDerSequence(contents);

    if (!cms) {
      return null;
    }

    const asn1 = asn1js.fromBER(toArrayBuffer(cms));

    if (asn1.offset === -1) {
      return null;
    }

    const contentInfo = new ContentInfo({ schema: asn1.result });

    if (contentInfo.contentType !== ContentInfo.SIGNED_DATA) {
      return null;
    }

    const signedData = new SignedData({ schema: contentInfo.content });
    const certificates = (signedData.certificates ?? []).filter(
      (certificate): certificate is Certificate =>
        certificate instanceof Certificate,
    );

    return {
      certificates,
      cmsContents: cms,
      signedData,
      vriKey: getPdfVriKey(cms),
    };
  } catch {
    return null;
  }
}

/**
 * ETSI PAdES VRI keys are conventionally keyed by a digest of the CMS
 * signature value. SHA-1 is retained here for interoperability with existing
 * PAdES validators that expect the historical VRI dictionary key format.
 */
export function getPdfVriKey(cmsContents: Buffer): string {
  return createHash('sha1').update(cmsContents).digest('hex').toUpperCase();
}

export function certificateToDer(certificate: Certificate): Buffer {
  return Buffer.from(certificate.toSchema(true).toBER(false));
}

export function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export function trimDerSequence(buffer: Buffer): Buffer | null {
  if (buffer.length < 2 || buffer[0] !== 0x30) {
    return null;
  }

  const lengthByte = buffer[1];

  if (lengthByte < 0x80) {
    const total = 2 + lengthByte;

    return total <= buffer.length ? buffer.subarray(0, total) : null;
  }

  const lengthBytes = lengthByte & 0x7f;

  if (!lengthBytes || lengthBytes > 4 || buffer.length < 2 + lengthBytes) {
    return null;
  }

  let contentLength = 0;

  for (let index = 0; index < lengthBytes; index += 1) {
    contentLength = contentLength * 256 + buffer[2 + index];
  }

  const total = 2 + lengthBytes + contentLength;

  return total <= buffer.length ? buffer.subarray(0, total) : null;
}
