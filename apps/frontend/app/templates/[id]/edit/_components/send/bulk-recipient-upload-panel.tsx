"use client";

import type { ChangeEvent } from "react";
import { readSheet } from "read-excel-file/browser";
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  InfoIcon,
  UploadIcon,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

import { FileUploadButton } from "./send-recipient-controls";
import {
  normalizeSheetRecipientRows,
  parseBulkRecipientRows,
} from "./template-send-recipient-mapping";
import type {
  BulkRecipientRow,
  RecipientSet,
  TemplateSendRole,
} from "./template-send-recipient-types";

export function BulkRecipientUploadPanel({
  bulkFileName,
  onBulkFileNameChange,
  onRecipientSetsParsed,
  parsedCount,
  roles,
  sampleHref,
}: {
  bulkFileName: string | null;
  onBulkFileNameChange: (fileName: string | null) => void;
  onRecipientSetsParsed: (sets: RecipientSet[]) => void;
  parsedCount: number;
  roles: TemplateSendRole[];
  sampleHref: string;
}) {
  async function parseExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const sheetRows = await readSheet(file);
      const rows = normalizeSheetRecipientRows(sheetRows);
      onRecipientSetsParsed(parseBulkRecipientRows(rows, roles));
      onBulkFileNameChange(file.name);
    } catch (error) {
      toast.error("Excel file could not be parsed", {
        description:
          error instanceof Error ? error.message : "Use an .xlsx workbook.",
      });
    } finally {
      event.target.value = "";
    }
  }

  function parseCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    Papa.parse<BulkRecipientRow>(file, {
      complete: (result) => {
        onRecipientSetsParsed(parseBulkRecipientRows(result.data, roles));
        onBulkFileNameChange(file.name);
      },
      error: (error) => {
        toast.error("CSV file could not be parsed", {
          description: error.message,
        });
      },
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
    });
    event.target.value = "";
  }

  return (
    <div className="grid gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--auth-muted),white_28%)] p-5">
      <BulkUploadIntro />
      <div className="grid gap-3 sm:grid-cols-3">
        <FileUploadButton
          accept=".csv,text/csv"
          icon={<UploadIcon className="size-4" />}
          label="Upload CSV"
          onChange={parseCsv}
        />
        <FileUploadButton
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          icon={<FileSpreadsheetIcon className="size-4" />}
          label="Upload XLSX"
          onChange={(event) => void parseExcel(event)}
        />
        <a
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--auth-input-border)] bg-white px-4 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]"
          download="signa-template-recipients-sample.csv"
          href={sampleHref}
        >
          <DownloadIcon className="size-4" />
          Sample
        </a>
      </div>
      <div className="rounded-2xl border border-[var(--auth-border)] bg-white px-4 py-3 text-sm text-[var(--auth-primary)]">
        {bulkFileName
          ? `${bulkFileName}: ${parsedCount} recipient group${parsedCount === 1 ? "" : "s"} parsed.`
          : "No recipient list uploaded yet."}
      </div>
    </div>
  );
}

function BulkUploadIntro() {
  return (
    <div className="flex gap-4">
      <InfoIcon className="mt-1 size-5 shrink-0 text-[var(--auth-primary)]" />
      <div>
        <p className="font-bold">Bulk send from Excel XLSX or CSV</p>
        <p className="mt-1 text-sm text-[var(--auth-muted-foreground)]">
          Upload a spreadsheet with role-specific name, email, and phone
          columns. Each row creates one recipient group.
        </p>
      </div>
    </div>
  );
}
