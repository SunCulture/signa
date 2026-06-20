"use client"

import type { ChangeEvent } from "react"
import { useState } from "react"
import Papa from "papaparse"
import { signaRoleLabels, signaRoles, type SignaRole } from "@repo/shared"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { importUsers, type ImportUserInput } from "@/lib/api/auth"

type CsvUserRow = {
  email?: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  role?: string
  team?: string
}

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
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Users</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <CsvDropInput onRowsParsed={setRows} />
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

function CsvDropInput({
  onRowsParsed,
}: {
  onRowsParsed: (rows: ImportUserInput[]) => void
}) {
  function parseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    Papa.parse<CsvUserRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      complete: (result) => {
        const rows = result.data.map(normalizeCsvRow).filter(isImportableRow)
        onRowsParsed(rows)
      },
      error: (error) => {
        toast.error("CSV could not be parsed", { description: error.message })
      },
    })
  }

  return (
    <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-[var(--auth-border)] bg-[var(--auth-muted)] p-5 text-center">
      <span className="text-sm font-bold text-[var(--auth-primary)]">
        Upload a CSV file
      </span>
      <span className="text-xs text-muted-foreground">
        Required headers: email, first_name, last_name. Optional: role, team.
      </span>
      <input
        accept=".csv,text/csv"
        className="sr-only"
        onChange={parseFile}
        type="file"
      />
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
          <span>{`${row.first_name} ${row.last_name}`}</span>
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

function normalizeCsvRow(row: CsvUserRow): ImportUserInput {
  return {
    email: (row.email ?? "").trim().toLowerCase(),
    first_name: (row.first_name ?? row.firstName ?? "").trim(),
    last_name: (row.last_name ?? row.lastName ?? "").trim(),
    role: normalizeRole(row.role),
    team: row.team?.trim() || undefined,
  }
}

function normalizeRole(role: string | undefined): SignaRole {
  const normalizedRole = role?.trim().toLowerCase()

  return signaRoles.includes(normalizedRole as SignaRole)
    ? (normalizedRole as SignaRole)
    : "member"
}

function isImportableRow(row: ImportUserInput): boolean {
  return Boolean(row.email && row.first_name && row.last_name)
}
