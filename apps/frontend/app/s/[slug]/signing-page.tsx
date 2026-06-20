"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2Icon,
  DownloadIcon,
  FileWarningIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  completeSigningForm,
  declineSigningForm,
  getSigningDownload,
  getSigningForm,
  type SigningField,
  type SigningForm,
  updateSigningValues,
  uploadSigningAttachment,
} from "@/lib/api/signing";
import { cn } from "@/lib/utils";
import { SignaturePanel } from "./signature-panel";

type ActivePanelState = {
  field: SigningField;
  mode: "complete" | "field";
};

export function SigningPage({
  focusFieldPrefix,
  slug,
  trackingParam,
}: {
  focusFieldPrefix?: string;
  slug: string;
  trackingParam?: string;
}) {
  const [form, setForm] = useState<SigningForm | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanelState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSigningForm(slug, trackingParam)
      .then((loadedForm) => {
        setForm(loadedForm);
        setActivePanel(getInitialPanelState(loadedForm, focusFieldPrefix));
      })
      .catch((loadError: unknown) => {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Signing form could not be loaded.";

        setError(message);
      })
      .finally(() => setIsLoading(false));
  }, [focusFieldPrefix, slug, trackingParam]);

  const orderedFields = useMemo(() => {
    if (!form) {
      return [];
    }

    return [...form.fields].sort(compareFieldsByDocumentPosition);
  }, [form]);

  async function saveFieldValue(field: SigningField, value: unknown) {
    if (!form) {
      return;
    }

    const fieldKey = getFieldKey(field);
    const nextValues = { ...form.values, [fieldKey]: value };
    const updatedForm = await updateSigningValues(slug, nextValues);

    setForm(updatedForm);
    setActivePanel(getNextPanelState(updatedForm, field));
  }

  async function completeForm(field: SigningField, value: unknown) {
    if (!form) {
      return;
    }

    const fieldKey = getFieldKey(field);
    const nextValues = { ...form.values, [fieldKey]: value };
    const completedForm = await completeSigningForm(slug, nextValues);

    setForm(completedForm);
    setActivePanel(null);
    toast.success("Document completed");
  }

  async function uploadFieldAttachment(file: File, type: string) {
    const attachment = await uploadSigningAttachment(slug, file, type);

    return attachment.uuid;
  }

  async function declineForm() {
    const declinedForm = await declineSigningForm(slug);

    setForm(declinedForm);
    setActivePanel(null);
    setIsDeclineOpen(false);
    toast.success("Document declined");
  }

  async function downloadDocuments() {
    setIsDownloading(true);

    try {
      const download = await getSigningDownload(slug);

      download.documents.forEach((document) => {
        const link = window.document.createElement("a");
        link.href = document.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.download = document.filename;
        link.click();
      });
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Document could not be downloaded.";

      toast.error("Download failed", { description: message });
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Spinner />
          Loading signing form
        </div>
      </main>
    );
  }

  if (error || !form) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] px-6 text-[var(--auth-foreground)]">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <FileWarningIcon className="size-10 text-[var(--auth-primary)]" />
          <h1 className="text-2xl font-bold">Signing form unavailable</h1>
          <p className="text-sm text-[var(--auth-muted-foreground)]">
            {error ?? "This signing link could not be opened."}
          </p>
        </div>
      </main>
    );
  }

  const isCompleted = Boolean(form.submitter.completed_at);
  const isDeclined = Boolean(form.submitter.declined_at);

  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-[1000px] flex-col px-3 py-3 sm:px-6 sm:py-4">
        <header className="mx-auto flex w-full max-w-[920px] flex-col gap-3 pb-1 sm:gap-4 sm:pb-2">
          <div className="flex justify-center">
            <Image
              alt="Signa"
              className="h-14 w-auto object-contain sm:h-[72px]"
              height={72}
              priority
              src="/images/logo.png"
              width={124}
            />
          </div>
        </header>

        <div className="sticky top-0 z-30 mx-auto mb-3 flex w-full max-w-[920px] items-center justify-between gap-3 bg-[var(--auth-background)]/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-[var(--auth-background)]/90 sm:mb-4">
          <h1 className="min-w-0 flex-1 truncate text-xl font-bold sm:text-3xl">
            {form.title}
          </h1>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              className="h-10 rounded-full bg-[var(--auth-muted)] px-4 text-xs font-bold text-[var(--auth-muted-foreground)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)] sm:h-9 sm:px-5"
              disabled={isCompleted || isDeclined}
              onClick={() => setIsDeclineOpen(true)}
              type="button"
              variant="ghost"
            >
              DECLINE
            </Button>
            <Button
              aria-label="Download"
              className="size-10 rounded-full bg-[var(--auth-primary)] p-0 text-xs font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)] sm:h-9 sm:w-auto sm:px-5"
              disabled={isDownloading}
              onClick={() => void downloadDocuments()}
              type="button"
            >
              {isDownloading ? (
                <Spinner className="size-4" />
              ) : (
                <DownloadIcon className="size-5 sm:size-4" />
              )}
              <span className="hidden sm:inline">DOWNLOAD</span>
            </Button>
          </div>
        </div>

        {isCompleted || isDeclined ? (
          <div
            className={cn(
              "mx-auto mb-4 flex w-full max-w-[920px] items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm",
              isCompleted
                ? "border-[var(--auth-primary)]/20 bg-[var(--auth-primary)]/8 text-[var(--auth-primary)]"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            <CheckCircle2Icon className="size-4 shrink-0" />
            <span>
              {isCompleted
                ? "This document has been completed."
                : "This document has been declined."}
            </span>
          </div>
        ) : null}

        <section className="flex flex-col items-center gap-4 pb-64 sm:gap-5 sm:pb-36">
          {form.documents.map((document) =>
            document.preview_images.map((previewImage, pageIndex) => (
              <DocumentPage
                activeFieldUuid={activePanel?.field.uuid ?? null}
                documentUuid={document.uuid}
                fields={orderedFields}
                form={form}
                key={`${document.uuid}-${previewImage.id ?? pageIndex}`}
                onSelectField={(field) =>
                  setActivePanel({ field, mode: "field" })
                }
                pageIndex={pageIndex}
                previewImage={previewImage}
              />
            )),
          )}
        </section>
      </div>

      {!isCompleted && !isDeclined ? (
        <SignaturePanel
          activeField={activePanel?.field ?? getInitialPanelState(form)?.field}
          fields={orderedFields}
          form={form}
          onComplete={completeForm}
          onSaveField={saveFieldValue}
          onSelectField={(field) => setActivePanel({ field, mode: "field" })}
          onUploadAttachment={uploadFieldAttachment}
        />
      ) : null}

      <AlertDialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Decline this document?</AlertDialogTitle>
          <AlertDialogDescription>
            This marks your signing link as declined. You will not be able to
            complete this document from this session afterward.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void declineForm()}
            >
              Decline document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DocumentPage({
  activeFieldUuid,
  documentUuid,
  fields,
  form,
  onSelectField,
  pageIndex,
  previewImage,
}: {
  activeFieldUuid: string | null;
  documentUuid: string;
  fields: SigningField[];
  form: SigningForm;
  onSelectField: (field: SigningField) => void;
  pageIndex: number;
  previewImage: {
    id: string;
    metadata?: { height?: number; width?: number } | null;
    url: string;
  };
}) {
  const width = previewImage.metadata?.width ?? 1000;
  const height = previewImage.metadata?.height ?? 1400;
  const pageFields = fields.filter((field) =>
    field.areas?.some(
      (area) => area.attachment_uuid === documentUuid && area.page === pageIndex,
    ),
  );

  return (
    <div
      className="relative w-full max-w-[920px] overflow-hidden rounded border border-[var(--auth-input-border)] bg-white shadow-sm"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${form.title} page ${pageIndex + 1}`}
        className="h-full w-full object-contain"
        height={height}
        loading="lazy"
        src={previewImage.url}
        width={width}
      />
      <div className="absolute inset-0">
        {pageFields.map((field) =>
          (field.areas ?? [])
            .filter(
              (area) =>
                area.attachment_uuid === documentUuid &&
                area.page === pageIndex,
            )
            .map((area, areaIndex) => (
              <button
                className={cn(
                  "absolute flex items-center justify-center rounded-sm border bg-red-100/70 px-1 text-left text-[var(--auth-primary)] transition",
                  "hover:border-red-500 hover:bg-red-100/90",
                  field.uuid === activeFieldUuid
                    ? "border-red-500 ring-2 ring-red-500/20"
                    : "border-red-400/80",
                )}
                key={`${field.uuid}-${areaIndex}`}
                onClick={() => onSelectField(field)}
                style={areaToStyle(area)}
                type="button"
              >
                <FieldDisplayValue field={field} values={form.values} />
              </button>
            )),
        )}
      </div>
    </div>
  );
}

function FieldDisplayValue({
  field,
  values,
}: {
  field: SigningField;
  values: Record<string, unknown>;
}) {
  const value = values[getFieldKey(field)] ?? field.default_value;

  if (field.type === "signature" || field.type === "initials") {
    return (
      <span className="text-sm font-bold">
        {isBlankValue(value) ? "Sign Here" : "Signed"}
      </span>
    );
  }

  if (field.type === "checkbox") {
    return <span className="text-lg font-bold">{value ? "✓" : ""}</span>;
  }

  if (field.type === "image" || field.type === "stamp" || field.type === "file") {
    return (
      <span className="truncate text-sm font-semibold">
        {isBlankValue(value) ? field.name || field.title || "Upload" : "Uploaded"}
      </span>
    );
  }

  return (
    <span className="truncate text-sm font-semibold">
      {isBlankValue(value) ? field.name || field.title || "Field" : String(value)}
    </span>
  );
}

function getInitialPanelState(
  form: SigningForm,
  focusFieldPrefix?: string,
): ActivePanelState | null {
  const sortedFields = [...form.fields].sort(compareFieldsByDocumentPosition);
  const focusedField = focusFieldPrefix
    ? sortedFields.find((field) => field.uuid?.startsWith(focusFieldPrefix))
    : null;
  const field = focusedField ?? sortedFields.find(
    (candidate) => !candidate.readonly && !hasFieldValue(form, candidate),
  );

  return field ? { field, mode: "field" } : null;
}

function getNextPanelState(
  form: SigningForm,
  currentField: SigningField,
): ActivePanelState | null {
  const fields = [...form.fields].sort(compareFieldsByDocumentPosition);
  const currentIndex = fields.findIndex(
    (field) => getFieldKey(field) === getFieldKey(currentField),
  );
  const nextField = fields
    .slice(Math.max(currentIndex + 1, 0))
    .find((field) => !field.readonly && !hasFieldValue(form, field));

  return nextField ? { field: nextField, mode: "field" } : null;
}

function compareFieldsByDocumentPosition(
  firstField: SigningField,
  secondField: SigningField,
): number {
  const firstArea = firstField.areas?.at(0);
  const secondArea = secondField.areas?.at(0);

  if (!firstArea || !secondArea) {
    return firstArea ? -1 : secondArea ? 1 : 0;
  }

  const firstAttachmentUuid = firstArea.attachment_uuid ?? "";
  const secondAttachmentUuid = secondArea.attachment_uuid ?? "";

  if (firstAttachmentUuid !== secondAttachmentUuid) {
    return firstAttachmentUuid.localeCompare(secondAttachmentUuid);
  }

  if (firstArea.page !== secondArea.page) {
    return (firstArea.page ?? 0) - (secondArea.page ?? 0);
  }

  if (firstArea.y !== secondArea.y) {
    return (firstArea.y ?? 0) - (secondArea.y ?? 0);
  }

  return (firstArea.x ?? 0) - (secondArea.x ?? 0);
}

function areaToStyle(area: {
  h?: number;
  w?: number;
  x?: number;
  y?: number;
}) {
  return {
    height: `${(area.h ?? 0.04) * 100}%`,
    left: `${(area.x ?? 0) * 100}%`,
    top: `${(area.y ?? 0) * 100}%`,
    width: `${(area.w ?? 0.2) * 100}%`,
  };
}

function hasFieldValue(form: SigningForm, field: SigningField): boolean {
  return !isBlankValue(form.values[getFieldKey(field)]);
}

function getFieldKey(field: SigningField): string {
  return field.uuid ?? field.name ?? "field";
}

function isBlankValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
