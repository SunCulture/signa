import { Injectable, Logger } from '@nestjs/common';

export type PdfDssEvidence = {
  certificateDer: Buffer[];
  crlResponses: Buffer[];
  ocspResponses: Buffer[];
  vriKey: string;
};

export type ParsedPdfDssEvidence = {
  certificateDer: Buffer[];
  crlResponses: Buffer[];
  hasMatchingVri: boolean;
  ocspResponses: Buffer[];
};

type PdfObject = {
  body: string;
  objectNumber: number;
};

@Injectable()
export class PdfDssVriEmbedder {
  private readonly logger = new Logger(PdfDssVriEmbedder.name);

  embed(input: { evidences: PdfDssEvidence[]; pdfBuffer: Buffer }): Buffer {
    const usefulEvidence = input.evidences.filter(
      (evidence) =>
        evidence.certificateDer.length ||
        evidence.ocspResponses.length ||
        evidence.crlResponses.length,
    );

    if (!usefulEvidence.length) {
      return input.pdfBuffer;
    }

    try {
      const context = parseIncrementalContext(input.pdfBuffer);
      const builder = new IncrementalPdfBuilder(input.pdfBuffer, context);
      const dssObjectRef = this.createDssObject(builder, usefulEvidence);
      const catalogBody = replaceOrAppendDictionaryEntry(
        context.catalogBody,
        'DSS',
        dssObjectRef,
      );

      builder.addObject(context.catalogObjectNumber, catalogBody);

      return builder.finalize();
    } catch (error) {
      this.logger.warn(
        `Skipping DSS/VRI embedding: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return input.pdfBuffer;
    }
  }

  read(input: { pdfBuffer: Buffer; vriKey: string }): ParsedPdfDssEvidence {
    const text = input.pdfBuffer.toString('latin1');
    const dssRef = /\/DSS\s+(\d+)\s+\d+\s+R/.exec(text)?.[1];

    if (!dssRef) {
      return emptyParsedEvidence(false);
    }

    const dssObject = readPdfObject(text, Number(dssRef));
    const vriRef = new RegExp(`/${input.vriKey}\\s+(\\d+)\\s+\\d+\\s+R`).exec(
      dssObject,
    )?.[1];

    if (!vriRef) {
      return emptyParsedEvidence(false);
    }

    const vriObject = readPdfObject(text, Number(vriRef));

    return {
      certificateDer: readStreamRefs(input.pdfBuffer, text, vriObject, 'Cert'),
      crlResponses: readStreamRefs(input.pdfBuffer, text, vriObject, 'CRL'),
      hasMatchingVri: true,
      ocspResponses: readStreamRefs(input.pdfBuffer, text, vriObject, 'OCSP'),
    };
  }

  private createDssObject(
    builder: IncrementalPdfBuilder,
    evidences: PdfDssEvidence[],
  ): string {
    const allCertRefs: string[] = [];
    const allOcspRefs: string[] = [];
    const allCrlRefs: string[] = [];
    const vriEntries: string[] = [];

    for (const evidence of evidences) {
      const certRefs = evidence.certificateDer.map((bytes) =>
        builder.addStreamObject(bytes),
      );
      const ocspRefs = evidence.ocspResponses.map((bytes) =>
        builder.addStreamObject(bytes),
      );
      const crlRefs = evidence.crlResponses.map((bytes) =>
        builder.addStreamObject(bytes),
      );
      const vriRef = builder.addObject(
        builder.nextObjectNumber(),
        [
          '<<',
          `/Cert [${certRefs.join(' ')}]`,
          `/OCSP [${ocspRefs.join(' ')}]`,
          `/CRL [${crlRefs.join(' ')}]`,
          '>>',
        ].join('\n'),
      );

      allCertRefs.push(...certRefs);
      allOcspRefs.push(...ocspRefs);
      allCrlRefs.push(...crlRefs);
      vriEntries.push(`/${evidence.vriKey} ${vriRef}`);
    }

    return builder.addObject(
      builder.nextObjectNumber(),
      [
        '<<',
        `/Certs [${allCertRefs.join(' ')}]`,
        `/OCSPs [${allOcspRefs.join(' ')}]`,
        `/CRLs [${allCrlRefs.join(' ')}]`,
        `/VRI << ${vriEntries.join(' ')} >>`,
        '>>',
      ].join('\n'),
    );
  }
}

class IncrementalPdfBuilder {
  private readonly objects: PdfObject[] = [];
  private objectNumberCursor: number;

  constructor(
    private readonly pdfBuffer: Buffer,
    private readonly context: IncrementalPdfContext,
  ) {
    this.objectNumberCursor = context.size;
  }

  nextObjectNumber(): number {
    this.objectNumberCursor += 1;

    return this.objectNumberCursor;
  }

  addObject(objectNumber: number, body: string): string {
    this.objects.push({ body, objectNumber });

    return `${objectNumber} 0 R`;
  }

  addStreamObject(bytes: Buffer): string {
    const objectNumber = this.nextObjectNumber();
    const header = `<< /Length ${bytes.byteLength} >>\nstream\n`;
    const footer = '\nendstream';
    const body = Buffer.concat([
      Buffer.from(header, 'latin1'),
      bytes,
      Buffer.from(footer, 'latin1'),
    ]).toString('latin1');

    return this.addObject(objectNumber, body);
  }

  finalize(): Buffer {
    const chunks: Buffer[] = [this.pdfBuffer, Buffer.from('\n', 'latin1')];
    const offsets = new Map<number, number>();
    let cursor = this.pdfBuffer.byteLength + 1;

    for (const object of this.objects) {
      offsets.set(object.objectNumber, cursor);
      const serialized = Buffer.from(
        `${object.objectNumber} 0 obj\n${object.body}\nendobj\n`,
        'latin1',
      );
      chunks.push(serialized);
      cursor += serialized.byteLength;
    }

    const xrefOffset = cursor;
    const xref = this.serializeXref(offsets);
    const trailer = [
      'trailer',
      `<< /Size ${this.objectNumberCursor + 1} /Root ${this.context.catalogObjectNumber} 0 R /Prev ${this.context.previousStartXref} >>`,
      'startxref',
      String(xrefOffset),
      '%%EOF',
      '',
    ].join('\n');

    chunks.push(Buffer.from(xref + trailer, 'latin1'));

    return Buffer.concat(chunks);
  }

  private serializeXref(offsets: Map<number, number>): string {
    return [...offsets.entries()]
      .sort(([left], [right]) => left - right)
      .map(([objectNumber, offset]) =>
        [
          'xref',
          `${objectNumber} 1`,
          `${String(offset).padStart(10, '0')} 00000 n `,
          '',
        ].join('\n'),
      )
      .join('');
  }
}

type IncrementalPdfContext = {
  catalogBody: string;
  catalogObjectNumber: number;
  previousStartXref: number;
  size: number;
};

function parseIncrementalContext(pdfBuffer: Buffer): IncrementalPdfContext {
  const text = pdfBuffer.toString('latin1');
  const previousStartXref = Number(
    /startxref\s+(\d+)\s+%%EOF\s*$/s.exec(text)?.[1],
  );
  const trailer = /trailer\s*<<(.*?)>>\s*startxref\s+\d+\s+%%EOF\s*$/s.exec(
    text,
  )?.[1];

  if (!Number.isSafeInteger(previousStartXref) || !trailer) {
    throw new Error('PDF trailer could not be parsed');
  }

  const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/.exec(trailer);
  const sizeMatch = /\/Size\s+(\d+)/.exec(trailer);

  if (!rootMatch || !sizeMatch) {
    throw new Error('PDF trailer Root or Size entry is missing');
  }

  const catalogObjectNumber = Number(rootMatch[1]);
  const catalogBody = readPdfObject(text, catalogObjectNumber);

  return {
    catalogBody,
    catalogObjectNumber,
    previousStartXref,
    size: Number(sizeMatch[1]),
  };
}

function readPdfObject(text: string, objectNumber: number): string {
  const match = new RegExp(
    `${objectNumber}\\s+0\\s+obj\\s*([\\s\\S]*?)endobj`,
  ).exec(text);

  if (!match) {
    throw new Error(`PDF object ${objectNumber} 0 could not be found`);
  }

  return match[1].trim();
}

function replaceOrAppendDictionaryEntry(
  dictionary: string,
  key: string,
  value: string,
): string {
  const entryPattern = new RegExp(
    `/${key}\\s+(?:\\d+\\s+\\d+\\s+R|<<[\\s\\S]*?>>)`,
  );

  if (entryPattern.test(dictionary)) {
    return dictionary.replace(entryPattern, `/${key} ${value}`);
  }

  const end = dictionary.lastIndexOf('>>');

  if (end === -1) {
    throw new Error('PDF catalog dictionary is malformed');
  }

  return `${dictionary.slice(0, end).trimEnd()}\n/${key} ${value}\n${dictionary.slice(end)}`;
}

function readStreamRefs(
  pdfBuffer: Buffer,
  text: string,
  object: string,
  key: string,
): Buffer[] {
  const match = new RegExp(`/${key}\\s*\\[([^\\]]*)\\]`).exec(object);

  if (!match) {
    return [];
  }

  const refs = [...match[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((ref) =>
    Number(ref[1]),
  );

  return refs.flatMap((objectNumber) =>
    readStreamObject(pdfBuffer, text, objectNumber),
  );
}

function readStreamObject(
  pdfBuffer: Buffer,
  text: string,
  objectNumber: number,
): Buffer[] {
  const objectHeader = `${objectNumber} 0 obj`;
  const objectStart = text.indexOf(objectHeader);

  if (objectStart === -1) {
    return [];
  }

  const streamStart = text.indexOf('stream', objectStart);
  const streamEnd = text.indexOf('endstream', streamStart);

  if (streamStart === -1 || streamEnd === -1) {
    return [];
  }

  const bodyStart =
    pdfBuffer[streamStart + 'stream'.length] === 0x0d &&
    pdfBuffer[streamStart + 'stream'.length + 1] === 0x0a
      ? streamStart + 'stream'.length + 2
      : streamStart + 'stream'.length + 1;
  const bodyEnd =
    pdfBuffer[streamEnd - 2] === 0x0d && pdfBuffer[streamEnd - 1] === 0x0a
      ? streamEnd - 2
      : streamEnd - 1;

  return [pdfBuffer.subarray(bodyStart, bodyEnd)];
}

function emptyParsedEvidence(hasMatchingVri: boolean): ParsedPdfDssEvidence {
  return {
    certificateDer: [],
    crlResponses: [],
    hasMatchingVri,
    ocspResponses: [],
  };
}
