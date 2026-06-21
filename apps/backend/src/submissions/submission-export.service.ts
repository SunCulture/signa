import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { StorageService } from '../storage/storage.service';
import { Submitter } from '../submitters/entities/submitter.entity';
import { Submission } from './entities/submission.entity';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import type { TemplateField } from '../templates/types/template-json';

type ExportFormat = 'csv' | 'xlsx';

type ExportCell = {
  name: string;
  value: string | null;
};

type ExportFile = {
  content: Buffer | string;
  contentType: string;
  filename: string;
};

@Injectable()
export class SubmissionExportService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async exportTemplateSubmissions(
    accountId: string,
    templateId: string,
    query: ListSubmissionsQueryDto & { format?: string },
  ): Promise<ExportFile> {
    const format = normalizeFormat(query.format);
    const submissions = await this.findExportSubmissions(
      accountId,
      templateId,
      query,
    );
    const rows = await Promise.all(
      submissions.map((submission) => this.buildTableRow(submission)),
    );
    const table = buildTable(rows);
    const filename = `${sanitizeFilename(submissions[0]?.template?.name ?? 'submissions')}.${format}`;

    if (format === 'xlsx') {
      return {
        content: buildXlsx(table),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename,
      };
    }

    return {
      content: rowsToCsv(table),
      contentType: 'text/csv; charset=utf-8',
      filename,
    };
  }

  private async findExportSubmissions(
    accountId: string,
    templateId: string,
    query: ListSubmissionsQueryDto,
  ): Promise<Submission[]> {
    const builder = this.submissions
      .createQueryBuilder('submission')
      .withDeleted()
      .leftJoinAndSelect('submission.template', 'template')
      .leftJoinAndSelect('submission.submitters', 'submitter')
      .where('submission.account_id = :accountId', { accountId })
      .andWhere('submission.template_id = :templateId', { templateId });

    if (query.archived) {
      builder.andWhere('submission.archived_at IS NOT NULL');
    } else {
      builder.andWhere('submission.archived_at IS NULL');
    }

    if (query.status) {
      this.applyStatusFilter(builder, query.status);
    }

    if (query.q) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('submitter.name ILIKE :q', { q: `%${query.q}%` })
            .orWhere('submitter.email ILIKE :q', { q: `%${query.q}%` })
            .orWhere('submitter.phone ILIKE :q', { q: `%${query.q}%` })
            .orWhere('submission.name ILIKE :q', { q: `%${query.q}%` });
        }),
      );
    }

    return builder
      .orderBy('submission.id', 'ASC')
      .addOrderBy('submitter.id', 'ASC')
      .getMany();
  }

  private applyStatusFilter(
    builder: ReturnType<Repository<Submission>['createQueryBuilder']>,
    status: string,
  ): void {
    if (status === 'completed') {
      builder.andWhere(
        'NOT EXISTS (SELECT 1 FROM submitters pending_submitter WHERE pending_submitter.submission_id = submission.id AND pending_submitter.completed_at IS NULL)',
      );
    } else if (status === 'declined') {
      builder.andWhere(
        'EXISTS (SELECT 1 FROM submitters declined_submitter WHERE declined_submitter.submission_id = submission.id AND declined_submitter.declined_at IS NOT NULL)',
      );
    } else if (status === 'expired') {
      builder.andWhere('submission.expire_at < :now', { now: new Date() });
    } else if (status === 'pending') {
      builder.andWhere(
        'EXISTS (SELECT 1 FROM submitters pending_submitter WHERE pending_submitter.submission_id = submission.id AND pending_submitter.completed_at IS NULL AND pending_submitter.declined_at IS NULL)',
      );
      builder.andWhere(
        '(submission.expire_at IS NULL OR submission.expire_at >= :now)',
        { now: new Date() },
      );
    }
  }

  private async buildTableRow(submission: Submission): Promise<ExportCell[]> {
    const submitters = [...(submission.submitters ?? [])].sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
    const submitterCount = submitters.length;
    const row: ExportCell[] = [];

    for (const submitter of submitters) {
      const role = getSubmitterRole(submission, submitter);

      row.push(...this.buildSubmitterCells(submitter, role, submitterCount));
      row.push(
        ...(await this.buildFieldValueCells(
          submission,
          submitter,
          role,
          submitterCount,
        )),
      );

      if (submitter === lastCompletedSubmitter(submitters)) {
        row.push(...(await this.buildDocumentCells(submitter)));
      }
    }

    return row.filter((cell) => cell.value !== null && cell.value !== '');
  }

  private buildSubmitterCells(
    submitter: Submitter,
    role: string,
    submitterCount: number,
  ): ExportCell[] {
    return [
      { name: columnName('Name', role, submitterCount), value: submitter.name },
      {
        name: columnName('Email', role, submitterCount),
        value: submitter.email,
      },
      {
        name: columnName('Phone', role, submitterCount),
        value: submitter.phone,
      },
      {
        name: columnName('Status', role, submitterCount),
        value: buildSubmitterStatus(submitter),
      },
      {
        name: columnName('Completed At', role, submitterCount),
        value: submitter.completedAt?.toISOString() ?? null,
      },
      {
        name: columnName('Link', role, submitterCount),
        value: submitter.completedAt
          ? null
          : this.buildSubmitterLink(submitter),
      },
    ];
  }

  private async buildFieldValueCells(
    submission: Submission,
    submitter: Submitter,
    role: string,
    submitterCount: number,
  ): Promise<ExportCell[]> {
    const fields =
      submission.templateFields ?? submission.template?.fields ?? [];
    const attachments = await this.loadSubmitterAttachments(submitter);
    const counters = new Map<string, number>();

    return fields
      .filter((field) => field.submitter_uuid === submitter.uuid)
      .map((field) => {
        const name = getFieldExportName(field, counters);

        return {
          name: columnName(name, role, submitterCount),
          value: this.formatFieldValue(
            field,
            submitter.values?.[field.uuid ?? ''],
            attachments,
          ),
        };
      });
  }

  private async buildDocumentCells(
    submitter: Submitter,
  ): Promise<ExportCell[]> {
    const documents = await this.storage.findRecordAttachments({
      recordType: 'Submitter',
      recordId: submitter.id,
      name: 'documents',
    });

    return documents.map((document, index) => ({
      name: `Document ${index + 1}`,
      value: this.storage.createBlobProxyUrl(document.blob),
    }));
  }

  private async loadSubmitterAttachments(
    submitter: Submitter,
  ): Promise<Map<string, StorageAttachment>> {
    const attachments = await this.storage.findRecordAttachments({
      recordType: 'Submitter',
      recordId: submitter.id,
      name: 'attachments',
    });

    return new Map(
      attachments.map((attachment) => [attachment.uuid, attachment]),
    );
  }

  private formatFieldValue(
    field: TemplateField,
    value: unknown,
    attachments: Map<string, StorageAttachment>,
  ): string | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (
      ['image', 'signature', 'initials', 'stamp'].includes(String(field.type))
    ) {
      return this.attachmentUrl(valueToString(value), attachments);
    }

    if (field.type === 'file') {
      return (Array.isArray(value) ? value : [value])
        .map((item) => this.attachmentUrl(valueToString(item), attachments))
        .filter((item): item is string => Boolean(item))
        .join('\n');
    }

    if (typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map(valueToString).join(', ');
    }

    return valueToString(value);
  }

  private attachmentUrl(
    attachmentUuid: string,
    attachments: Map<string, StorageAttachment>,
  ): string | null {
    const attachment = attachments.get(attachmentUuid);

    return attachment ? this.storage.createBlobProxyUrl(attachment.blob) : null;
  }

  private buildSubmitterLink(submitter: Submitter): string {
    const origin = this.config.get<string>(
      'FRONTEND_ORIGIN',
      'http://localhost:3000',
    );

    return `${origin}/s/${submitter.slug}`;
  }
}

function buildTable(rows: ExportCell[][]): string[][] {
  const headers = [
    ...rows.reduce((names, row) => {
      row.forEach((cell) => names.add(cell.name));

      return names;
    }, new Set<string>()),
  ];

  return [
    headers,
    ...rows.map((row) =>
      headers.map(
        (header) => row.find((cell) => cell.name === header)?.value ?? '',
      ),
    ),
  ];
}

function rowsToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','),
    )
    .join('\n');
}

function buildXlsx(rows: string[][]): Buffer {
  const files = new Map<string, string>();

  files.set(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  );
  files.set(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  files.set(
    'xl/workbook.xml',
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Submissions" sheetId="1" r:id="rId1"/></sheets></workbook>',
  );
  files.set(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  files.set('xl/worksheets/sheet1.xml', buildSheetXml(rows));

  return buildZip(files);
}

function buildSheetXml(rows: string[][]): string {
  const body = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map(
            (cell, columnIndex) =>
              `<c r="${columnNameFromIndex(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`,
          )
          .join('')}</row>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function buildZip(files: Map<string, string>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [filename, content] of files) {
    const name = Buffer.from(filename);
    const data = Buffer.from(content);
    const crc = crc32(data);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + data.length;
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, central, end]);
}

function crc32(input: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function columnNameFromIndex(index: number): string {
  let name = '';
  let current = index + 1;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - remainder) / 26);
  }

  return name;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getFieldExportName(
  field: TemplateField,
  counters: Map<string, number>,
): string {
  if (field.name) {
    return field.name;
  }

  const type = String(field.type ?? 'field');
  const count = (counters.get(type) ?? 0) + 1;
  counters.set(type, count);

  return `${humanize(type)} Field ${count}`;
}

function getSubmitterRole(
  submission: Submission,
  submitter: Submitter,
): string {
  const submitters =
    submission.templateSubmitters ?? submission.template?.submitters ?? [];
  const role = submitters.find((item) => item.uuid === submitter.uuid)?.name;

  return (
    role ?? submitter.name ?? submitter.email ?? submitter.phone ?? 'Submitter'
  );
}

function lastCompletedSubmitter(
  submitters: Submitter[],
): Submitter | undefined {
  return submitters
    .filter((submitter) => submitter.completedAt)
    .sort((a, b) => Number(a.completedAt) - Number(b.completedAt))
    .at(-1);
}

function buildSubmitterStatus(submitter: Submitter): string {
  if (submitter.completedAt) {
    return 'completed';
  }

  if (submitter.declinedAt) {
    return 'declined';
  }

  if (submitter.openedAt) {
    return 'opened';
  }

  if (submitter.sentAt) {
    return 'sent';
  }

  return 'awaiting';
}

function columnName(
  name: string,
  submitterName: string,
  submitterCount: number,
): string {
  return submitterCount > 1 ? `${submitterName} - ${name}` : name;
}

function humanize(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeFormat(format: string | undefined): ExportFormat {
  return format === 'xlsx' ? 'xlsx' : 'csv';
}

function sanitizeFilename(value: string): string {
  return (
    value.replaceAll(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'submissions'
  );
}

function valueToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}
