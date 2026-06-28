"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleXIcon,
  FileTextIcon,
  IdCardIcon,
  PlusIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
  UserRoundIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  type AccountPreferences,
  type DocumentFilenameFormat,
  type SigningCertificate,
  deleteSigningCertificate,
  getAccountPreferences,
  listSigningCertificates,
  makeDefaultSigningCertificate,
  updateAccountPreferences,
  updateSigningTimestampServer,
  uploadSigningCertificate,
} from "@/lib/api/auth"
import { verifyPdfFile, type VerifyPdfResponse } from "@/lib/api/tools"
import { SettingsSidebar } from "./settings-sidebar"

const filenameFormats: Array<{
  label: string
  value: DocumentFilenameFormat
}> = [
  { label: "Document Name.pdf", value: "{document.name}" },
  {
    label: "Document Name - signed.pdf",
    value: "{document.name} - {submission.status}",
  },
  {
    label: "Document Name - name@domain.com.pdf",
    value: "{document.name} - {submission.submitters}",
  },
  {
    label: "Document Name - name@domain.com - date.pdf",
    value: "{document.name} - {submission.submitters} - {submission.completed_at}",
  },
]

export function ESignatureSettingsBody() {
  return (
    <div className="flex w-full flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="E-Signature" />
      <ESignaturePanel />
    </div>
  )
}

function ESignaturePanel() {
  const [preferences, setPreferences] = useState<AccountPreferences | null>(null)
  const [certificates, setCertificates] = useState<SigningCertificate[]>([])
  const [timestampServerUrl, setTimestampServerUrl] = useState("")
  const [verification, setVerification] = useState<VerifyPdfResponse | null>(null)
  const [verificationFileName, setVerificationFileName] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    Promise.all([getAccountPreferences(), listSigningCertificates()])
      .then(([loadedPreferences, loadedCertificates]) => {
        setPreferences(loadedPreferences)
        setCertificates(loadedCertificates.data)
        setTimestampServerUrl(loadedCertificates.timestamp_server_url ?? "")
      })
      .catch((error: unknown) =>
        toast.error("E-signature settings could not be loaded", {
          description: getErrorMessage(error),
        })
      )
  }, [])

  async function verifyPdf(file: File) {
    setIsVerifying(true)
    setVerification(null)
    setVerificationFileName(file.name)

    try {
      const result = await verifyPdfFile(file)

      setVerification(result)
      toast.success("PDF verification completed")
    } catch (error) {
      toast.error("PDF verification failed", {
        description: getErrorMessage(error),
      })
    } finally {
      setIsVerifying(false)
    }
  }

  async function savePreference(patch: Partial<AccountPreferences>) {
    try {
      setPreferences(await updateAccountPreferences(patch))
      toast.success("E-signature preferences saved")
    } catch (error) {
      toast.error("E-signature preferences failed to save", {
        description: getErrorMessage(error),
      })
    }
  }

  async function uploadCertificate(file: File, name: string, password: string) {
    try {
      await uploadSigningCertificate(file, name, password)
      const nextCertificates = await listSigningCertificates()

      setCertificates(nextCertificates.data)
      setTimestampServerUrl(nextCertificates.timestamp_server_url ?? "")
      toast.success("Signing certificate uploaded")
    } catch (error) {
      toast.error("Signing certificate upload failed", {
        description: getErrorMessage(error),
      })
    }
  }

  async function setDefaultCertificate(name: string) {
    await makeDefaultSigningCertificate(name)
    const nextCertificates = await listSigningCertificates()

    setCertificates(nextCertificates.data)
    setTimestampServerUrl(nextCertificates.timestamp_server_url ?? "")
    toast.success("Default certificate updated")
  }

  async function removeCertificate(name: string) {
    await deleteSigningCertificate(name)
    const nextCertificates = await listSigningCertificates()

    setCertificates(nextCertificates.data)
    setTimestampServerUrl(nextCertificates.timestamp_server_url ?? "")
    toast.success("Signing certificate removed")
  }

  async function saveTimestampServerUrl(value: string) {
    try {
      const nextCertificates = await updateSigningTimestampServer(
        value.trim() || null,
      )

      setCertificates(nextCertificates.data)
      setTimestampServerUrl(nextCertificates.timestamp_server_url ?? "")
      toast.success("Timestamp server saved")
    } catch (error) {
      toast.error("Timestamp server failed to save", {
        description: getErrorMessage(error),
      })
    }
  }

  return (
    <section className="min-w-0 flex-1">
      <h1 className="text-4xl font-bold tracking-normal">PDF Signature</h1>
      <p className="mt-5">Upload signed PDF file to validate its signature:</p>
      <PdfVerificationDropzone isVerifying={isVerifying} onFile={verifyPdf} />
      <VerificationResult
        fileName={verificationFileName}
        verification={verification}
      />

      <SigningCertificatesSection
        certificates={certificates}
        onMakeDefault={setDefaultCertificate}
        onRemove={removeCertificate}
        onTimestampServerSave={saveTimestampServerUrl}
        onUpload={uploadCertificate}
        timestampServerUrl={timestampServerUrl}
      />

      {preferences ? (
        <ESignaturePreferences
          onSave={savePreference}
          preferences={preferences}
        />
      ) : null}
    </section>
  )
}

function SigningCertificatesSection({
  certificates,
  onMakeDefault,
  onRemove,
  onTimestampServerSave,
  onUpload,
  timestampServerUrl,
}: {
  certificates: SigningCertificate[]
  onMakeDefault: (name: string) => Promise<void>
  onRemove: (name: string) => Promise<void>
  onTimestampServerSave: (value: string) => Promise<void>
  onUpload: (file: File, name: string, password: string) => Promise<void>
  timestampServerUrl: string
}) {
  const [nextTimestampServerUrl, setNextTimestampServerUrl] =
    useState(timestampServerUrl)

  useEffect(() => setNextTimestampServerUrl(timestampServerUrl), [
    timestampServerUrl,
  ])

  return (
    <>
      <div className="mt-10 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-normal">
          Signing Certificates
        </h2>
        <CertificateUploadButton onUpload={onUpload} />
      </div>
      <CertificateTable
        certificates={certificates}
        onMakeDefault={onMakeDefault}
        onRemove={onRemove}
      />
      <div className="mt-8 max-w-xl space-y-3">
        <Label>Timestamp server URL</Label>
        <div className="flex gap-3">
          <input
            className="h-12 min-w-0 flex-1 rounded-full border bg-transparent px-5 outline-none"
            onChange={(event) =>
              setNextTimestampServerUrl(event.target.value)
            }
            placeholder="URL (optional)"
            type="url"
            value={nextTimestampServerUrl}
          />
          <Button
            className="h-12 rounded-full px-6"
            onClick={() => void onTimestampServerSave(nextTimestampServerUrl)}
            type="button"
          >
            SAVE
          </Button>
        </div>
      </div>
    </>
  )
}

function ESignaturePreferences({
  onSave,
  preferences,
}: {
  onSave: (patch: Partial<AccountPreferences>) => Promise<void>
  preferences: AccountPreferences
}) {
  return (
    <div className="mt-9 max-w-xl space-y-6">
      <h2 className="text-3xl font-bold tracking-normal">Preferences</h2>
      <PreferenceSwitch
        checked={preferences.esigning_preference === "multiple"}
        label="Apply multiple PDF digital signatures in the document per each signer"
        onCheckedChange={(checked) =>
          void onSave({
            esigning_preference: checked ? "multiple" : "single",
          })
        }
      />
      <PreferenceSwitch
        checked={preferences.flatten_result_pdf}
        label="Remove PDF form fillable fields from the signed PDF (flatten form)"
        onCheckedChange={(flatten_result_pdf) =>
          void onSave({ flatten_result_pdf })
        }
      />
      <div className="space-y-2">
        <Label>Document download filename format</Label>
        <Select
          onValueChange={(document_filename_format) =>
            void onSave({
              document_filename_format:
                document_filename_format as DocumentFilenameFormat,
            })
          }
          value={preferences.document_filename_format}
        >
          <SelectTrigger className="h-12 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filenameFormats.map((format) => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function PdfVerificationDropzone({
  isVerifying,
  onFile,
}: {
  isVerifying: boolean
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <button
      className="mt-3 flex h-32 w-full max-w-xl flex-col items-center justify-center rounded-md border border-dashed border-[var(--auth-primary)]/80 bg-[var(--auth-muted)] text-center transition hover:bg-[var(--auth-muted)]/70"
      onClick={() => inputRef.current?.click()}
      type="button"
    >
      <UploadCloudIcon className="size-8" />
      <span className="mt-1 font-bold">
        {isVerifying ? "Analyzing..." : "Verify Signed PDF"}
      </span>
      <span className="text-xs">Click to upload or drag and drop files</span>
      <input
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            onFile(file)
          }
        }}
        ref={inputRef}
        type="file"
      />
    </button>
  )
}

function VerificationResult({
  fileName,
  verification,
}: {
  fileName: string
  verification: VerifyPdfResponse | null
}) {
  if (!verification) {
    return null
  }

  const signatures = verification.signatures
  const signatureCount = signatures.length
  const isTrusted = verification.checksum_status === "verified"

  if (signatureCount === 0) {
    return (
      <div className="mt-5 w-full max-w-xl rounded-md border bg-card px-4 py-3">
        <p className="text-sm">{fileName || "PDF document"}</p>
        <p className="mt-2 text-xl font-bold">There are no signatures...</p>
      </div>
    )
  }

  return (
    <div className="mt-5 w-full max-w-xl rounded-md border bg-card px-4 py-3">
      <div className="flex items-center gap-2 border-b border-dashed pb-3 text-sm">
        <FileTextIcon className="size-4" />
        <span>
          {fileName || "PDF document"} - {signatureCount}{" "}
          {signatureCount === 1 ? "Signature" : "Signatures"}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <VerificationStatusLine
          icon="success"
          label="Signature valid"
        />
        <VerificationStatusLine
          icon={isTrusted ? "success" : "error"}
          label={
            isTrusted
              ? "Signed with trusted certificate"
              : "Signed with external certificate"
          }
        />
        <p className="text-xl font-bold leading-snug">
          Certificate chain: {getCertificateChainLabel(verification)}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-sm">
        {signatures.map((signature, index) => (
          <SignatureMetadata
            key={`${signature.signature_type ?? "signature"}-${index}`}
            signature={signature}
          />
        ))}
      </div>
    </div>
  )
}

function VerificationStatusLine({
  icon,
  label,
}: {
  icon: "error" | "success"
  label: string
}) {
  const Icon = icon === "success" ? CheckCircle2Icon : CircleXIcon

  return (
    <div className="flex items-center gap-2 text-xl font-bold leading-tight">
      <Icon
        className={
          icon === "success"
            ? "size-5 text-emerald-500"
            : "size-5 text-rose-500"
        }
      />
      <span>{label}</span>
    </div>
  )
}

function SignatureMetadata({
  signature,
}: {
  signature: VerifyPdfResponse["signatures"][number]
}) {
  return (
    <>
      <MetadataLine
        icon={UserRoundIcon}
        label={`Signed with ${signature.signer_name ?? "Unknown signer"}`}
      />
      <MetadataLine
        icon={CalendarDaysIcon}
        label={formatSigningTime(signature.signing_time)}
      />
      <MetadataLine
        icon={IdCardIcon}
        label={signature.signing_reason ?? "Signa"}
      />
      <MetadataLine
        icon={ShieldCheckIcon}
        label={signature.signature_type ?? "PDF signature"}
      />
    </>
  )
}

function MetadataLine({
  icon: Icon,
  label,
}: {
  icon: typeof BadgeCheckIcon
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4" />
      <span>{label}</span>
    </div>
  )
}

function getCertificateChainLabel(verification: VerifyPdfResponse): string {
  if (verification.cryptographic_verification) {
    return "Signa -> Signa Sub-CA -> Signa Root CA"
  }

  return verification.checksum_status === "verified"
    ? "Signa completed document checksum"
    : "External PDF signature"
}

function formatSigningTime(value: string | null): string {
  if (!value) {
    return "Signing time unavailable"
  }

  const date = parsePdfSigningDate(value) ?? new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function parsePdfSigningDate(value: string): Date | null {
  const normalized = value.startsWith("D:") ? value.slice(2) : value
  const match =
    /^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?(Z|[+-]\d{2}'?\d{2}'?)?$/.exec(
      normalized
    )

  if (!match) {
    return null
  }

  const [
    ,
    year,
    month,
    day,
    hour = "00",
    minute = "00",
    second = "00",
    timezone = "",
  ] = match
  const parsedDate = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}${formatPdfTimezone(
      timezone
    )}`
  )

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function formatPdfTimezone(timezone: string): string {
  if (!timezone || timezone === "Z") {
    return "Z"
  }

  const normalized = timezone.replaceAll("'", "")

  return `${normalized.slice(0, 3)}:${normalized.slice(3, 5)}`
}

function CertificateUploadButton({
  onUpload,
}: {
  onUpload: (file: File, name: string, password: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <Button
        className="h-12 rounded-full px-6"
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        <PlusIcon data-icon="inline-start" />
        UPLOAD CERT
      </Button>
      <input
        accept=".p12,.pfx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            const password =
              window.prompt(
                "Enter the certificate password if this P12/PFX is protected.",
              ) ?? ""

            onUpload(file, file.name.replace(/\.[^.]+$/, ""), password)
            event.currentTarget.value = ""
          }
        }}
        ref={inputRef}
        type="file"
      />
    </>
  )
}

function CertificateTable({
  certificates,
  onMakeDefault,
  onRemove,
}: {
  certificates: SigningCertificate[]
  onMakeDefault: (name: string) => Promise<void>
  onRemove: (name: string) => Promise<void>
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-t-2xl">
      <table className="w-full text-left">
        <thead className="bg-[var(--auth-muted)] text-xs uppercase">
          <tr>
            <th className="px-5 py-4">Name</th>
            <th className="px-5 py-4">Valid to</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right" />
          </tr>
        </thead>
        <tbody>
          {certificates.map((certificate) => (
            <tr className="border-b" key={certificate.name}>
              <td className="px-5 py-4">{certificate.name}</td>
              <td className="px-5 py-4">{certificate.valid_to ?? "-"}</td>
              <td className="px-5 py-4">
                {certificate.status === "default" ? (
                  <span className="rounded-full border px-3 py-1 text-xs font-bold">
                    Default
                  </span>
                ) : (
                  <button
                    className="text-xs font-bold underline underline-offset-4"
                    onClick={() => void onMakeDefault(certificate.name)}
                    type="button"
                  >
                    Make default
                  </button>
                )}
              </td>
              <td className="px-5 py-4 text-right">
                {certificate.status !== "default" ? (
                  <button
                    className="text-xs font-bold text-destructive underline underline-offset-4"
                    onClick={() => void onRemove(certificate.name)}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PreferenceSwitch({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-5 py-2.5">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Request failed"
}
