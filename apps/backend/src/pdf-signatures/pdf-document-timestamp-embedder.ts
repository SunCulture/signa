import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PdfTimestampEvidence } from './pdf-timestamp-evidence';
import {
  parseTimestampServerUrls,
  Rfc3161TimestampClient,
} from './rfc3161-timestamp-client';

export type TimestampedPdfResult = {
  buffer: Buffer;
  timestamp: PdfTimestampEvidence;
};

const byteRangePlaceholder = '[0000000000 0000000000 0000000000 0000000000]';
const timestampPlaceholderBytes = 20_000;

@Injectable()
export class PdfDocumentTimestampEmbedder {
  constructor(
    private readonly config: ConfigService,
    private readonly timestampClient: Rfc3161TimestampClient,
  ) {}

  async embedDocumentTimestamp(input: {
    pdfBuffer: Buffer;
    timestampServerUrl: string | null;
  }): Promise<TimestampedPdfResult> {
    const serverUrls = parseTimestampServerUrls(input.timestampServerUrl);
    const required = this.isTimestampRequired();

    if (serverUrls.length === 0) {
      return {
        buffer: input.pdfBuffer,
        timestamp: buildDisabledTimestampEvidence(required),
      };
    }

    const preparedPdf = appendTimestampPlaceholder(input.pdfBuffer);
    const digest = calculateTimestampByteRangeDigest(preparedPdf.buffer);
    const timestampToken = await this.timestampClient.requestTimestampToken({
      digest,
      serverUrls,
    });

    if (!timestampToken.token) {
      return this.handleMissingTimestampToken({
        attempts: timestampToken.attempts,
        pdfBuffer: input.pdfBuffer,
        required,
      });
    }

    return {
      buffer: fillTimestampPlaceholder(
        preparedPdf.buffer,
        timestampToken.token,
      ),
      timestamp: {
        attempts: timestampToken.attempts,
        embedded: true,
        required,
        status: 'embedded',
        tokenSha256: sha256Base64Url(timestampToken.token),
        url: timestampToken.url,
      },
    };
  }

  private handleMissingTimestampToken(input: {
    attempts: PdfTimestampEvidence['attempts'];
    pdfBuffer: Buffer;
    required: boolean;
  }): TimestampedPdfResult {
    if (input.required) {
      throw new Error(
        'PDF timestamp is required but no TSA token was returned',
      );
    }

    return {
      buffer: input.pdfBuffer,
      timestamp: {
        attempts: input.attempts,
        embedded: false,
        required: false,
        status: 'failed',
        tokenSha256: null,
        url: null,
      },
    };
  }

  private isTimestampRequired(): boolean {
    return this.config.get<boolean>('PDF_TIMESTAMP_REQUIRED', false) === true;
  }
}

export function appendTimestampPlaceholder(pdfBuffer: Buffer): {
  buffer: Buffer;
} {
  const previousXrefOffset = findPreviousStartXref(pdfBuffer);
  const nextObjectNumber = findNextObjectNumber(pdfBuffer);
  const timestampObject = buildTimestampObject(nextObjectNumber);
  const timestampObjectOffset = pdfBuffer.byteLength + 1;
  const xrefOffset = timestampObjectOffset + Buffer.byteLength(timestampObject);
  const trailer = buildIncrementalTrailer({
    nextObjectNumber,
    previousXrefOffset,
    timestampObjectOffset,
    xrefOffset,
  });

  return {
    buffer: Buffer.concat([
      pdfBuffer,
      Buffer.from('\n', 'latin1'),
      Buffer.from(timestampObject, 'latin1'),
      Buffer.from(trailer, 'latin1'),
    ]),
  };
}

function buildDisabledTimestampEvidence(
  required: boolean,
): PdfTimestampEvidence {
  if (required) {
    throw new Error('PDF timestamp is required but no TSA URL is configured');
  }

  return {
    attempts: [],
    embedded: false,
    required,
    status: 'disabled',
    tokenSha256: null,
    url: null,
  };
}

function buildTimestampObject(objectNumber: number): string {
  const contents = '0'.repeat(timestampPlaceholderBytes * 2);

  return `${objectNumber} 0 obj
<<
/Type /DocTimeStamp
/Filter /Adobe.PPKLite
/SubFilter /ETSI.RFC3161
/ByteRange ${byteRangePlaceholder}
/Contents <${contents}>
/M (${formatPdfUtcDate(new Date())})
>>
endobj
`;
}

function buildIncrementalTrailer(input: {
  nextObjectNumber: number;
  previousXrefOffset: number;
  timestampObjectOffset: number;
  xrefOffset: number;
}): string {
  return `xref
${input.nextObjectNumber} 1
${String(input.timestampObjectOffset).padStart(10, '0')} 00000 n 
trailer
<<
/Size ${input.nextObjectNumber + 1}
/Prev ${input.previousXrefOffset}
>>
startxref
${input.xrefOffset}
%%EOF
`;
}

function calculateTimestampByteRangeDigest(pdfBuffer: Buffer): Buffer {
  const { contentsEnd, contentsStart } = findTimestampContentsRange(pdfBuffer);
  const byteRange = [
    0,
    contentsStart,
    contentsEnd,
    pdfBuffer.byteLength - contentsEnd,
  ] as const;
  const pdfWithByteRange = replaceByteRange(pdfBuffer, byteRange);

  return createHash('sha256')
    .update(pdfWithByteRange.subarray(byteRange[0], byteRange[1]))
    .update(
      pdfWithByteRange.subarray(byteRange[2], byteRange[2] + byteRange[3]),
    )
    .digest();
}

function fillTimestampPlaceholder(
  pdfBuffer: Buffer,
  timestampToken: Buffer,
): Buffer {
  const { contentsEnd, contentsStart } = findTimestampContentsRange(pdfBuffer);
  const byteRange = [
    0,
    contentsStart,
    contentsEnd,
    pdfBuffer.byteLength - contentsEnd,
  ] as const;
  const pdfWithByteRange = replaceByteRange(pdfBuffer, byteRange);
  const tokenHex = timestampToken.toString('hex');
  const placeholderLength = contentsEnd - contentsStart - 2;

  if (tokenHex.length > placeholderLength) {
    throw new Error(
      `Timestamp token exceeds PDF placeholder length: ${tokenHex.length} > ${placeholderLength}`,
    );
  }

  return Buffer.concat([
    pdfWithByteRange.subarray(0, contentsStart + 1),
    Buffer.from(tokenHex.padEnd(placeholderLength, '0'), 'latin1'),
    pdfWithByteRange.subarray(contentsEnd - 1),
  ]);
}

function replaceByteRange(
  pdfBuffer: Buffer,
  byteRange: readonly [number, number, number, number],
): Buffer {
  const current = pdfBuffer.toString('latin1');
  const replacement = `[${byteRange.join(' ')}]`;
  const padded = replacement.padEnd(byteRangePlaceholder.length, ' ');

  return Buffer.from(current.replace(byteRangePlaceholder, padded), 'latin1');
}

function findTimestampContentsRange(pdfBuffer: Buffer): {
  contentsEnd: number;
  contentsStart: number;
} {
  const marker = Buffer.from('/SubFilter /ETSI.RFC3161', 'latin1');
  const timestampIndex = pdfBuffer.lastIndexOf(marker);

  if (timestampIndex === -1) {
    throw new Error('Timestamp placeholder was not found');
  }

  const contentsKeyword = Buffer.from('/Contents ', 'latin1');
  const contentsKeywordIndex = pdfBuffer.indexOf(
    contentsKeyword,
    timestampIndex,
  );
  const contentsStart = pdfBuffer.indexOf('<', contentsKeywordIndex);
  const contentsEnd = pdfBuffer.indexOf('>', contentsStart) + 1;

  if (contentsKeywordIndex === -1 || contentsStart === -1 || contentsEnd <= 0) {
    throw new Error('Timestamp contents placeholder was not found');
  }

  return { contentsEnd, contentsStart };
}

function findPreviousStartXref(pdfBuffer: Buffer): number {
  const match = /startxref\s+(\d+)\s+%%EOF\s*$/s.exec(
    pdfBuffer.toString('latin1'),
  );

  if (!match) {
    throw new Error('PDF startxref marker was not found');
  }

  return Number(match[1]);
}

function findNextObjectNumber(pdfBuffer: Buffer): number {
  const text = pdfBuffer.toString('latin1');
  const trailerSize = [...text.matchAll(/\/Size\s+(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isSafeInteger)
    .at(-1);

  if (trailerSize) {
    return trailerSize;
  }

  const maxObjectNumber = [...text.matchAll(/\n(\d+)\s+\d+\s+obj/g)].reduce(
    (max, match) => Math.max(max, Number(match[1])),
    0,
  );

  return maxObjectNumber + 1;
}

function formatPdfUtcDate(date: Date): string {
  return `D:${date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')}`;
}

function sha256Base64Url(value: Buffer): string {
  return createHash('sha256').update(value).digest('base64url');
}
