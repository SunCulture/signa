"use client"

import type { ChangeEvent, ReactNode } from "react"
import { useMemo, useState } from "react"
import { readSheet } from "read-excel-file/browser"
import Papa from "papaparse"
import { signaRoleLabels, signaRoles, type SignaRole } from "@repo/shared"
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { importUsers, type ImportUserInput } from "@/lib/api/auth"

type ImportRow = {
  email?: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  role?: string
  team?: string
}

const sampleCsv =
  "email,first_name,last_name,role,team\nada@example.com,Ada,Lovelace,admin,Legal\ngrace@example.com,Grace,Hopper,member,Engineering\n"

export function UsersImportDialog({ onImported }: { onImported: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [rows, setRows] = useState<ImportUserInput[]>([])

  async function importRows() {
    setIsImporting(true)

    try {
      const response = await importUsers(rows)

      toast.success("Users import finished", {
        description: `${response.created} created, ${response.restored} restored, ${response.skipped} skipped, ${response.failed} failed.`,
      })
      setIsOpen(false)
      setRows([])
      onImported()
    } catch (error) {
      toast.error("Users could not be imported", {
        description: error instanceof Error ? error.message : "Please try again.",
        classNames: { icon: "text-destructive" },
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-12 rounded-full bg-[var(--auth-muted)] px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)]"
          type="button"
          variant="ghost"
        >
          <UploadIcon data-icon="inline-start" />
          Import Users
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Users</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <SampleDownloadLink />
          <ImportSourceTabs onRowsParsed={setRows} />
          <ImportPreview rows={rows} />
          <Button
            className="h-12 rounded-full"
            disabled={rows.length === 0 || isImporting}
            onClick={importRows}
            type="button"
          >
            {isImporting ? "IMPORTING..." : "IMPORT USERS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SampleDownloadLink() {
  const sampleHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`,
    []
  )

  return (
    <a
      className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--auth-border)] px-4 py-2 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]"
      download="signa-users-import-sample.csv"
      href={sampleHref}
    >
      <DownloadIcon className="size-4" />
      Download sample CSV
    </a>
  )
}

function ImportSourceTabs({
  onRowsParsed,
}: {
  onRowsParsed: (rows: ImportUserInput[]) => void
}) {
  return (
    <Tabs defaultValue="csv">
      <TabsList className="grid h-10 w-full grid-cols-2 rounded-full bg-[var(--auth-muted)] p-1">
        <TabsTrigger className="rounded-full" value="csv">
          CSV or emails
        </TabsTrigger>
        <TabsTrigger className="rounded-full" value="excel">
          Excel
        </TabsTrigger>
      </TabsList>
      <TabsContent className="mt-3 grid gap-3" value="csv">
        <EmailPasteInput onRowsParsed={onRowsParsed} />
        <CsvDropInput onRowsParsed={onRowsParsed} />
      </TabsContent>
      <TabsContent className="mt-3" value="excel">
        <ExcelDropInput onRowsParsed={onRowsParsed} />
      </TabsContent>
    </Tabs>
  )
}

function EmailPasteInput({
  onRowsParsed,
}: {
  onRowsParsed: (rows: ImportUserInput[]) => void
}) {
  const [emails, setEmails] = useState("")

  return (
    <div className="grid gap-2 rounded-2xl border border-border p-4">
      <Textarea
        className="min-h-24 rounded-2xl"
        onChange={(event) => setEmails(event.target.value)}
        placeholder="ada@example.com, grace@example.com"
        value={emails}
      />
      <Button
        className="h-10 w-fit rounded-full px-5"
        onClick={() => onRowsParsed(parseEmailList(emails))}
        type="button"
        variant="outline"
      >
        Preview emails
      </Button>
    </div>
  )
}

function CsvDropInput({
  onRowsParsed,
}: {
  onRowsParsed: (rows: ImportUserInput[]) => void
}) {
  function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    Papa.parse<ImportRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      complete: (result) => {
        onRowsParsed(result.data.map(normalizeImportRow).filter(isImportableRow))
      },
      error: (error) => {
        toast.error("CSV could not be parsed", { description: error.message })
      },
    })
  }

  return (
    <FileDropInput
      accept=".csv,text/csv"
      description="Headers: email, first_name, last_name, role, team. Only email is required."
      icon={<UploadIcon className="size-5" />}
      label="Upload CSV"
      onChange={parseFile}
    />
  )
}

function ExcelDropInput({
  onRowsParsed,
}: {
  onRowsParsed: (rows: ImportUserInput[]) => void
}) {
  async function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      const rows = await readSheet(file)
      onRowsParsed(normalizeSheetRows(rows))
    } catch (error) {
      toast.error("Excel file could not be parsed", {
        description: error instanceof Error ? error.message : "Use an .xlsx file.",
      })
    }
  }

  return (
    <FileDropInput
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      description="Use the same headers as the CSV sample. Excel import supports .xlsx files."
      icon={<FileSpreadsheetIcon className="size-5" />}
      label="Upload Excel workbook"
      onChange={parseFile}
    />
  )
}

function FileDropInput({
  accept,
  description,
  icon,
  label,
  onChange,
}: {
  accept: string
  description: string
  icon: ReactNode
  label: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-[var(--auth-border)] bg-[var(--auth-muted)] p-5 text-center">
      <span className="mx-auto text-[var(--auth-primary)]">{icon}</span>
      <span className="text-sm font-bold text-[var(--auth-primary)]">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
      <input accept={accept} className="sr-only" onChange={onChange} type="file" />
    </label>
  )
}

function ImportPreview({ rows }: { rows: ImportUserInput[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
        No valid users parsed yet.
      </p>
    )
  }

  return (
    <div className="max-h-64 overflow-auto rounded-2xl border border-border">
      {rows.slice(0, 20).map((row) => (
        <div
          className="grid grid-cols-[1fr_1.5fr_100px] gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"
          key={`${row.email}-${row.role}`}
        >
          <span>{getPreviewName(row)}</span>
          <span className="truncate text-muted-foreground">{row.email}</span>
          <span className="capitalize">{signaRoleLabels[row.role ?? "member"]}</span>
        </div>
      ))}
      {rows.length > 20 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          Showing first 20 of {rows.length} valid rows.
        </p>
      ) : null}
    </div>
  )
}

function normalizeSheetRows(rows: unknown[][]): ImportUserInput[] {
  const [headerRow, ...dataRows] = rows
  const headers = headerRow?.map((cell) => normalizeHeader(cell)) ?? []

  return dataRows
    .map((row) => toImportRow(headers, row))
    .map(normalizeImportRow)
    .filter(isImportableRow)
}

function toImportRow(headers: string[], row: unknown[]): ImportRow {
  return Object.fromEntries(
    headers.map((header, index) => [header, String(row[index] ?? "")])
  )
}

function normalizeImportRow(row: ImportRow): ImportUserInput {
  return {
    email: (row.email ?? "").trim().toLowerCase(),
    first_name: normalizeOptionalText(row.first_name ?? row.firstName),
    last_name: normalizeOptionalText(row.last_name ?? row.lastName),
    role: normalizeRole(row.role),
    team: normalizeOptionalText(row.team),
  }
}

function parseEmailList(value: string): ImportUserInput[] {
  return value
    .split(/[,\s;]+/)
    .map((email) => ({ email: email.trim().toLowerCase(), role: "member" as const }))
    .filter(isImportableRow)
}

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase()
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

function normalizeRole(role: string | undefined): SignaRole {
  const normalizedRole = role?.trim().toLowerCase()

  return signaRoles.includes(normalizedRole as SignaRole)
    ? (normalizedRole as SignaRole)
    : "member"
}

function isImportableRow(row: ImportUserInput): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
}

function getPreviewName(row: ImportUserInput): string {
  return [row.first_name, row.last_name].filter(Boolean).join(" ") || "No name"
}
