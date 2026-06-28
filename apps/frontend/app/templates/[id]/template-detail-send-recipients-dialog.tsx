"use client";

import type { ChangeEvent, ComponentProps, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { readSheet } from "read-excel-file/browser";
import {
  DownloadIcon,
  FileSpreadsheetIcon,
  InfoIcon,
  UploadIcon,
  UserRoundPlusIcon,
} from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createTemplateSubmission,
  type CreateSubmissionSubmitterInput,
} from "@/lib/api/submissions";
import {
  updateTemplatePreferences,
  type TemplateResponse,
} from "@/lib/api/templates";
import {
  getRequestEmailBody,
  getRequestEmailSubject,
  normalizeSheetRecipientRows,
  parseBulkRecipientRows,
} from "./edit/_components/send/template-send-recipient-mapping";
import { SendRecipientMessagePanel } from "./edit/_components/send/send-recipient-message-panel";
import type {
  BulkRecipientRow,
  SendRecipientTab,
  TemplateSendRole,
} from "./edit/_components/send/template-send-recipient-types";

type DetailRecipient = {
  email: string;
  id: string;
  name: string;
  phone: string;
};

const emptyRecipient = (): DetailRecipient => ({
  email: "",
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `recipient-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: "",
  phone: "",
});

export function TemplateDetailSendRecipientsDialog({
  onOpenChange,
  onSent,
  open,
  template,
}: {
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
  open: boolean;
  template: TemplateResponse;
}) {
  const primaryRole = getPrimaryRole(template);
  const [activeTab, setActiveTab] = useState<SendRecipientTab>("email");
  const [emailText, setEmailText] = useState("");
  const [phoneRecipients, setPhoneRecipients] = useState<DetailRecipient[]>([
    emptyRecipient(),
  ]);
  const [detailedRecipients, setDetailedRecipients] = useState<
    DetailRecipient[]
  >([emptyRecipient()]);
  const [bulkRecipients, setBulkRecipients] = useState<DetailRecipient[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [messageBody, setMessageBody] = useState(getRequestEmailBody(template));
  const [messageSubject, setMessageSubject] = useState(
    getRequestEmailSubject(template),
  );
  const [saveMessage, setSaveMessage] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const roles = useMemo<TemplateSendRole[]>(
    () => [{ id: "primary-role", name: primaryRole }],
    [primaryRole],
  );
  const sampleHref = useMemo(
    () =>
      `data:text/csv;charset=utf-8,${encodeURIComponent(
        "Name,Email,Phone\nJane Recipient,jane@example.com,+155501001\n",
      )}`,
    [],
  );

  async function submitRecipients(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submitters = buildSubmittersForActiveTab({
      activeTab,
      bulkRecipients,
      detailedRecipients,
      emailText,
      phoneRecipients,
      primaryRole,
      sendEmail,
    });

    if (!submitters.length) {
      toast.error("Add at least one recipient");
      return;
    }

    setIsSending(true);

    try {
      if (saveMessage) {
        await updateTemplatePreferences(template.id, {
          request_email_body: messageBody.trim(),
          request_email_subject: messageSubject.trim(),
        });
      }

      for (const submitter of submitters) {
        await createTemplateSubmission(template.id, {
          message: submitter.send_email
            ? {
                body: messageBody.trim(),
                subject: messageSubject.trim(),
              }
            : undefined,
          name: template.name,
          send_email: submitter.send_email,
          send_sms: submitter.send_sms,
          submitters: [submitter],
          submitters_order: "preserved",
        });
      }

      toast.success("Recipients added", {
        description:
          submitters.length === 1
            ? "The recipient can now complete this document."
            : `${submitters.length} recipients can now complete this document.`,
      });
      onOpenChange(false);
      onSent?.();
    } catch (error) {
      toast.error("Recipients could not be added", {
        description:
          error instanceof Error
            ? error.message
            : "Please check the recipients and try again.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90svh] max-w-[590px] overflow-hidden rounded-2xl bg-[var(--auth-background)] p-0 text-[var(--auth-foreground)]">
        <form
          className="flex max-h-[90svh] flex-col"
          onSubmit={(event) => void submitRecipients(event)}
        >
          <DialogHeader className="border-b border-[var(--auth-border)] px-5 py-4">
            <DialogTitle className="pr-8 text-lg font-bold">
              Add New Recipients
            </DialogTitle>
          </DialogHeader>

          <Tabs
            className="min-h-0 flex-1 gap-0"
            onValueChange={(value) => setActiveTab(value as SendRecipientTab)}
            value={activeTab}
          >
            <div className="px-5 pt-4">
              <TabsList className="mx-auto grid h-9 w-full max-w-[450px] grid-cols-4 rounded-full bg-[color-mix(in_srgb,var(--auth-muted),white_20%)] p-1">
                <TabsTrigger className="rounded-full font-bold" value="email">
                  via Email
                </TabsTrigger>
                <TabsTrigger className="rounded-full font-bold" value="phone">
                  via Phone
                </TabsTrigger>
                <TabsTrigger
                  className="rounded-full font-bold"
                  value="detailed"
                >
                  Detailed
                </TabsTrigger>
                <TabsTrigger className="rounded-full font-bold" value="upload">
                  Upload List
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <TabsContent value="email">
                <EmailRecipientsTextarea
                  onChange={setEmailText}
                  value={emailText}
                />
              </TabsContent>
              <TabsContent value="phone">
                <CompactRecipientsPanel
                  mode="phone"
                  onChange={setPhoneRecipients}
                  recipients={phoneRecipients}
                />
                <SmsDeliveryNotice />
              </TabsContent>
              <TabsContent value="detailed">
                <CompactRecipientsPanel
                  mode="detailed"
                  onChange={setDetailedRecipients}
                  recipients={detailedRecipients}
                />
                <SmsDeliveryNotice />
              </TabsContent>
              <TabsContent value="upload">
                <CompactUploadListPanel
                  bulkFileName={bulkFileName}
                  onBulkFileNameChange={setBulkFileName}
                  onRecipientsParsed={setBulkRecipients}
                  parsedCount={bulkRecipients.length}
                  roles={roles}
                  sampleHref={sampleHref}
                />
              </TabsContent>

              <DetailSendOptions
                activeTab={activeTab}
                isMessageOpen={isMessageOpen}
                onMessageOpenChange={setIsMessageOpen}
                onSendEmailChange={setSendEmail}
                sendEmail={sendEmail}
              />

              {isMessageOpen && activeTab !== "phone" ? (
                <SendRecipientMessagePanel
                  messageBody={messageBody}
                  messageSubject={messageSubject}
                  onBodyChange={setMessageBody}
                  onSaveMessageChange={setSaveMessage}
                  onSubjectChange={setMessageSubject}
                  saveMessage={saveMessage}
                />
              ) : null}
            </div>
          </Tabs>

          <div className="p-5">
            <Button
              className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={isSending}
              type="submit"
            >
              {isSending ? "ADDING RECIPIENTS..." : "ADD RECIPIENTS"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmailRecipientsTextarea({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <textarea
      className="min-h-[75px] w-full resize-y rounded-3xl border border-[var(--auth-input-border)] bg-white px-5 py-3 text-base shadow-none outline-none placeholder:text-[var(--auth-muted-foreground)] focus:ring-0"
      onChange={(event) => onChange(event.target.value)}
      placeholder="Type emails here..."
      value={value}
    />
  );
}

function CompactRecipientsPanel({
  mode,
  onChange,
  recipients,
}: {
  mode: "phone" | "detailed";
  onChange: (recipients: DetailRecipient[]) => void;
  recipients: DetailRecipient[];
}) {
  function updateRecipient(id: string, patch: Partial<DetailRecipient>) {
    onChange(
      recipients.map((recipient) =>
        recipient.id === id ? { ...recipient, ...patch } : recipient,
      ),
    );
  }

  function addRecipient() {
    onChange([...recipients, emptyRecipient()]);
  }

  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--auth-muted),white_28%)] p-4">
        {recipients.map((recipient) => (
          <div
            className={
              mode === "phone"
                ? "grid gap-3 md:grid-cols-2"
                : "grid gap-3 md:grid-cols-2"
            }
            key={recipient.id}
          >
            {mode === "detailed" ? (
              <PillInput
                autoComplete="name"
                className="md:col-span-2"
                onChange={(name) => updateRecipient(recipient.id, { name })}
                placeholder="Name"
                value={recipient.name}
              />
            ) : null}
            {mode === "phone" ? (
              <>
                <PillInput
                  autoComplete="tel"
                  onChange={(phone) => updateRecipient(recipient.id, { phone })}
                  placeholder="Phone"
                  type="tel"
                  value={recipient.phone}
                />
                <PillInput
                  autoComplete="name"
                  onChange={(name) => updateRecipient(recipient.id, { name })}
                  placeholder="Name (optional)"
                  value={recipient.name}
                />
              </>
            ) : null}
            {mode === "detailed" ? (
              <>
                <PillInput
                  autoComplete="email"
                  onChange={(email) => updateRecipient(recipient.id, { email })}
                  placeholder="Email (optional)"
                  type="email"
                  value={recipient.email}
                />
                <PillInput
                  autoComplete="tel"
                  onChange={(phone) => updateRecipient(recipient.id, { phone })}
                  placeholder="Phone (optional)"
                  type="tel"
                  value={recipient.phone}
                />
              </>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-4 px-4">
        <Button
          className="h-10 w-full rounded-full bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)] font-bold text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_14%)]"
          onClick={addRecipient}
          type="button"
          variant="ghost"
        >
          <UserRoundPlusIcon data-icon="inline-start" />
          ADD NEW
        </Button>
      </div>
    </>
  );
}

function CompactUploadListPanel({
  bulkFileName,
  onBulkFileNameChange,
  onRecipientsParsed,
  parsedCount,
  roles,
  sampleHref,
}: {
  bulkFileName: string | null;
  onBulkFileNameChange: (fileName: string | null) => void;
  onRecipientsParsed: (recipients: DetailRecipient[]) => void;
  parsedCount: number;
  roles: TemplateSendRole[];
  sampleHref: string;
}) {
  async function parseExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const rows = normalizeSheetRecipientRows(await readSheet(file));
      onRecipientsParsed(mapBulkRowsToDetailRecipients(rows, roles));
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
        onRecipientsParsed(mapBulkRowsToDetailRecipients(result.data, roles));
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
      <div className="flex gap-4">
        <InfoIcon className="mt-1 size-5 shrink-0 text-[var(--auth-primary)]" />
        <div>
          <p className="font-bold">Bulk send from Excel XLSX or CSV</p>
          <p className="mt-1 text-sm text-[var(--auth-muted-foreground)]">
            Upload recipient names, emails, and phone numbers.
          </p>
        </div>
      </div>
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
          download="signa-recipients-sample.csv"
          href={sampleHref}
        >
          <DownloadIcon className="size-4" />
          Sample
        </a>
      </div>
      <div className="rounded-2xl border border-[var(--auth-border)] bg-white px-4 py-3 text-sm text-[var(--auth-primary)]">
        {bulkFileName
          ? `${bulkFileName}: ${parsedCount} recipient${parsedCount === 1 ? "" : "s"} parsed.`
          : "No recipient list uploaded yet."}
      </div>
    </div>
  );
}

function DetailSendOptions({
  activeTab,
  isMessageOpen,
  onMessageOpenChange,
  onSendEmailChange,
  sendEmail,
}: {
  activeTab: SendRecipientTab;
  isMessageOpen: boolean;
  onMessageOpenChange: (open: boolean) => void;
  onSendEmailChange: (send: boolean) => void;
  sendEmail: boolean;
}) {
  if (activeTab === "phone" || activeTab === "upload") {
    return null;
  }

  return (
    <div className="mt-5 flex min-h-8 items-center justify-between gap-4">
      <label className="flex items-center gap-3 text-base">
        <Checkbox
          checked={sendEmail}
          className="size-5 rounded-md border-[var(--auth-primary)] data-checked:bg-[var(--auth-primary)]"
          onCheckedChange={(value) => onSendEmailChange(value === true)}
        />
        Send Email
      </label>
      <button
        className="text-sm font-medium underline underline-offset-2"
        onClick={() => onMessageOpenChange(!isMessageOpen)}
        type="button"
      >
        Edit message
      </button>
    </div>
  );
}

function SmsDeliveryNotice() {
  return (
    <div className="mt-4 flex gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--auth-muted),white_20%)] p-4">
      <InfoIcon className="mt-1 size-5 shrink-0 text-[var(--auth-primary)]" />
      <div>
        <p className="font-bold">Send signature requests via SMS</p>
        <p className="text-sm text-[var(--auth-muted-foreground)]">
          Phone recipients will receive a signing link when SMS delivery is
          configured for this workspace.
        </p>
      </div>
    </div>
  );
}

function PillInput({
  className = "",
  onChange,
  value,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange"> & {
  onChange: (value: string) => void;
}) {
  return (
    <Input
      className={`h-10 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none focus-visible:ring-0 ${className}`}
      onChange={(event) => onChange(event.target.value)}
      value={value}
      {...props}
    />
  );
}

function FileUploadButton({
  accept,
  icon,
  label,
  onChange,
}: {
  accept: string;
  icon: ReactNode;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--auth-input-border)] bg-white px-4 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]">
      {icon}
      {label}
      <input
        accept={accept}
        className="sr-only"
        onChange={onChange}
        type="file"
      />
    </label>
  );
}

function buildSubmittersForActiveTab(input: {
  activeTab: SendRecipientTab;
  bulkRecipients: DetailRecipient[];
  detailedRecipients: DetailRecipient[];
  emailText: string;
  phoneRecipients: DetailRecipient[];
  primaryRole: string;
  sendEmail: boolean;
}): CreateSubmissionSubmitterInput[] {
  if (input.activeTab === "email") {
    return parseEmailList(input.emailText).map((email) => ({
      email,
      name: email,
      role: input.primaryRole,
      send_email: input.sendEmail,
      send_sms: false,
    }));
  }

  if (input.activeTab === "phone") {
    return normalizeRecipients(input.phoneRecipients)
      .filter((recipient) => recipient.phone)
      .map((recipient) => ({
        name: recipient.name || recipient.phone,
        phone: recipient.phone,
        role: input.primaryRole,
        send_email: false,
        send_sms: true,
      }));
  }

  const recipients =
    input.activeTab === "upload"
      ? input.bulkRecipients
      : input.detailedRecipients;

  return normalizeRecipients(recipients)
    .filter((recipient) => recipient.email || recipient.phone)
    .map((recipient) => ({
      email: recipient.email || undefined,
      name: recipient.name || recipient.email || recipient.phone,
      phone: recipient.phone || undefined,
      role: input.primaryRole,
      send_email: Boolean(recipient.email && input.sendEmail),
      send_sms: Boolean(recipient.phone),
    }));
}

function getPrimaryRole(template: TemplateResponse): string {
  return template.submitters[0]?.name?.trim() || "First Party";
}

function mapBulkRowsToDetailRecipients(
  rows: BulkRecipientRow[],
  roles: TemplateSendRole[],
): DetailRecipient[] {
  return parseBulkRecipientRows(rows, roles)
    .flatMap((recipientSet) =>
      roles.map((role) => recipientSet.contacts[role.id]),
    )
    .map((contact) => ({
      email: contact.email.trim(),
      id: emptyRecipient().id,
      name: contact.name.trim(),
      phone: contact.phone.trim(),
    }))
    .filter((recipient) => recipient.email || recipient.phone);
}

function normalizeRecipients(recipients: DetailRecipient[]): DetailRecipient[] {
  return recipients.map((recipient) => ({
    ...recipient,
    email: recipient.email.trim(),
    name: recipient.name.trim(),
    phone: recipient.phone.trim(),
  }));
}

function parseEmailList(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}
