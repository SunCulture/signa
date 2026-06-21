"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  CopyIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FolderIcon,
  LinkIcon,
  MessageSquareTextIcon,
  PencilIcon,
  PenLineIcon,
  PlusIcon,
  SendIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { getAuthSession } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import {
  archiveSubmission,
  createSubmission,
  downloadTemplateSubmissionsExport,
  listSubmissions,
  type SubmissionResponse,
} from "@/lib/api/submissions";
import {
  archiveTemplate,
  cloneTemplate,
  getTemplate,
  type TemplateResponse,
  updateTemplate,
  updateTemplatePreferences,
} from "@/lib/api/templates";
import { ThemeModeSwitcher } from "../_components/theme-mode-switcher";
import { UserMenu } from "../_components/user-menu";
import { TemplatePreferencesDialog } from "./edit/template-preferences-dialog";
import { TemplateActionButton } from "./template-detail-action-button";
import { TemplateSubmissionRow } from "./template-submission-row";

type TemplateDetailPageProps = {
  templateId: string;
};

export function TemplateDetailPage({ templateId }: TemplateDetailPageProps) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isUpdatingSharedLink, setIsUpdatingSharedLink] = useState(false);
  const [isOpeningSelfSign, setIsOpeningSelfSign] = useState(false);

  const fetchTemplateDetail = useCallback(async () => {
    const [templateResponse, submissionsResponse] = await Promise.all([
      getTemplate(templateId),
      listSubmissions({
        include: "fields",
        limit: 100,
        template_id: templateId,
      }),
    ]);

    return { submissionsResponse, templateResponse };
  }, [templateId]);

  async function loadTemplateDetail() {
    setIsLoading(true);

    try {
      const { submissionsResponse, templateResponse } =
        await fetchTemplateDetail();

      setTemplate(templateResponse);
      setSubmissions(submissionsResponse.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login");
        return;
      }

      toast.error("Template could not be loaded", {
        description:
          error instanceof Error ? error.message : "Open the templates page.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialTemplateDetail() {
      try {
        const { submissionsResponse, templateResponse } =
          await fetchTemplateDetail();

        if (isCancelled) {
          return;
        }

        setTemplate(templateResponse);
        setSubmissions(submissionsResponse.data);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          router.push("/auth/login");
          return;
        }

        toast.error("Template could not be loaded", {
          description:
            error instanceof Error ? error.message : "Open the templates page.",
        });
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialTemplateDetail();

    return () => {
      isCancelled = true;
    };
  }, [fetchTemplateDetail, router]);

  async function copyTemplateLink() {
    if (!template) {
      return;
    }

    await navigator.clipboard.writeText(
      `${window.location.origin}/d/${template.slug}`,
    );
    toast.success("Template link copied");
  }

  async function archiveCurrentTemplate() {
    if (!template) {
      return;
    }

    setIsMutating(true);

    try {
      await archiveTemplate(template.id);
      toast.success("Template archived", { description: template.name });
      router.push("/templates?archived=true");
    } catch (error) {
      toast.error("Template archive failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function duplicateTemplate() {
    if (!template) {
      return;
    }

    setIsMutating(true);

    try {
      const clonedTemplate = await cloneTemplate(template.id, {
        name: `${template.name} (Clone)`,
      });

      toast.success("Template cloned", { description: clonedTemplate.name });
      router.push(`/templates/${clonedTemplate.id}`);
    } catch (error) {
      toast.error("Template clone failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function addRecipients(input: AddRecipientsFormValue) {
    if (!template) {
      return;
    }

    setIsMutating(true);

    try {
      const message = input.customMessage
        ? {
            body: input.messageBody,
            subject: input.messageSubject,
          }
        : undefined;

      if (input.saveMessage && message) {
        await updateTemplatePreferences(template.id, {
          request_email_body: message.body,
          request_email_subject: message.subject,
        });
      }

      await createSubmission({
        message,
        name: input.name || undefined,
        send_email: input.sendEmail,
        send_sms: input.sendSms,
        submitters_order: input.order,
        template_id: template.id,
        submitters: input.recipients.map((recipient) => ({
          email: recipient.email,
          message,
          name: recipient.name || undefined,
          phone: recipient.phone || undefined,
          role: recipient.role,
          send_email: input.sendEmail,
          send_sms: input.sendSms,
        })),
      });
      toast.success("Recipients added", {
        description: `${input.recipients.length} signature request${
          input.recipients.length === 1 ? "" : "s"
        } created.`,
      });
      setIsRecipientsOpen(false);
      await loadTemplateDetail();
    } catch (error) {
      toast.error("Recipient could not be added", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function saveTemplatePreferences(preferences: Record<string, unknown>) {
    if (!template) {
      return;
    }

    const previousPreferences = template.preferences;
    const nextPreferences = {
      ...previousPreferences,
      ...preferences,
    };

    setTemplate({ ...template, preferences: nextPreferences });
    setIsSavingPreferences(true);

    try {
      await updateTemplatePreferences(template.id, preferences);
      toast.success("Preferences saved");
      setIsPreferencesOpen(false);
    } catch (error) {
      setTemplate({ ...template, preferences: previousPreferences });
      toast.error("Preferences update failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function updateTemplateSharedLink(sharedLink: boolean) {
    if (!template) {
      return;
    }

    const previousSharedLink = template.shared_link;

    setTemplate({ ...template, shared_link: sharedLink });
    setIsUpdatingSharedLink(true);

    try {
      await updateTemplate(template.id, { shared_link: sharedLink });
      toast.success(
        sharedLink ? "Shared link enabled" : "Shared link disabled",
      );
    } catch (error) {
      setTemplate({ ...template, shared_link: previousSharedLink });
      toast.error("Shared link update failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsUpdatingSharedLink(false);
    }
  }

  async function archiveRow(submission: SubmissionResponse) {
    setIsMutating(true);

    try {
      await archiveSubmission(submission.id);
      toast.success("Submission archived");
      await loadTemplateDetail();
    } catch (error) {
      toast.error("Submission archive failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function openSelfSigningForm() {
    if (!template) {
      return;
    }

    const session = getAuthSession();
    const signingWindow = window.open("", "_blank");
    const userName = [
      session?.user.first_name ?? "",
      session?.user.last_name ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    setIsOpeningSelfSign(true);

    try {
      const [submitter] = await createSubmission({
        name: template.name,
        template_id: template.id,
        submitters: [
          {
            email: session?.user.email,
            name: userName || session?.user.email || "Self signer",
            role: template.submitters.at(0)?.name ?? "First Party",
          },
        ],
      });

      if (!submitter?.slug) {
        throw new Error("The signing link was not returned by the API.");
      }

      if (signingWindow) {
        signingWindow.location.href = `/s/${submitter.slug}`;
        signingWindow.focus();
      } else {
        router.push(`/s/${submitter.slug}`);
      }

      await loadTemplateDetail();
    } catch (error) {
      signingWindow?.close();
      toast.error("Self-signing form could not be opened", {
        description:
          error instanceof Error
            ? error.message
            : "The signing form could not be created.",
      });
    } finally {
      setIsOpeningSelfSign(false);
    }
  }

  if (isLoading) {
    return <TemplateDetailLoading />;
  }

  if (!template) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)]">
        <p className="text-sm font-semibold text-[var(--auth-muted-foreground)]">
          Template not found.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-4 md:px-2">
        <TemplateDetailTopbar />

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-[2rem] font-semibold leading-tight">
                {template.name}
              </h1>
              <Link
                className="mt-1 flex w-fit items-center gap-1 text-sm text-[var(--auth-primary)] hover:underline"
                href="/templates"
              >
                <FolderIcon data-icon="inline-start" />
                {template.folder_name}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Button
                aria-label="Preferences"
                className="rounded-full bg-[var(--auth-muted)] text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]"
                onClick={() => setIsPreferencesOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Settings2Icon />
              </Button>
              <TemplateActionButton onClick={copyTemplateLink}>
                <LinkIcon data-icon="inline-start" />
                LINK
              </TemplateActionButton>
              <TemplateActionButton
                disabled={isMutating}
                onClick={() => void archiveCurrentTemplate()}
                variant="outline"
              >
                <ArchiveIcon data-icon="inline-start" />
                ARCHIVE
              </TemplateActionButton>
              <TemplateActionButton
                disabled={isMutating}
                onClick={() => void duplicateTemplate()}
                variant="outline"
              >
                <CopyIcon data-icon="inline-start" />
                CLONE
              </TemplateActionButton>
              <TemplateActionButton asChild variant="outline">
                <Link href={`/templates/${template.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  EDIT
                </Link>
              </TemplateActionButton>
            </div>
          </div>

          {submissions.length ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-3xl font-semibold">Submissions</h2>
              <div className="flex flex-wrap items-center gap-3">
                <TemplateActionButton
                  onClick={() => setIsExportOpen(true)}
                  variant="ghost"
                >
                  <DownloadIcon data-icon="inline-start" />
                  EXPORT
                </TemplateActionButton>
                <TemplateActionButton
                  disabled={isMutating}
                  onClick={() => setIsRecipientsOpen(true)}
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  ADD RECIPIENTS
                </TemplateActionButton>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            {submissions.length ? (
              submissions.map((submission) => (
                <TemplateSubmissionRow
                  disabled={isMutating}
                  key={submission.id}
                  onArchive={() => void archiveRow(submission)}
                  submission={submission}
                />
              ))
            ) : (
              <TemplateSubmissionsEmptyState
                isOpeningSelfSign={isOpeningSelfSign}
                isSendingRecipients={isMutating}
                onSendRecipients={() => setIsRecipientsOpen(true)}
                onSignYourself={() => void openSelfSigningForm()}
              />
            )}
          </div>
        </section>
      </div>
      {isPreferencesOpen ? (
        <TemplatePreferencesDialog
          isSaving={isSavingPreferences}
          isUpdatingSharedLink={isUpdatingSharedLink}
          onOpenChange={setIsPreferencesOpen}
          onSave={saveTemplatePreferences}
          onSharedLinkChange={updateTemplateSharedLink}
          open={isPreferencesOpen}
          template={template}
        />
      ) : null}
      {isRecipientsOpen ? (
        <AddRecipientsDialog
          isSaving={isMutating}
          onOpenChange={setIsRecipientsOpen}
          onSubmit={(input) => void addRecipients(input)}
          open={isRecipientsOpen}
          template={template}
        />
      ) : null}
      {isExportOpen ? (
        <ExportSubmissionsDialog
          onOpenChange={setIsExportOpen}
          open={isExportOpen}
          submissions={submissions}
          template={template}
        />
      ) : null}
    </main>
  );
}

type AddRecipientsFormValue = {
  customMessage: boolean;
  messageBody: string;
  messageSubject: string;
  name: string;
  order: "preserved" | "random";
  recipients: Array<{
    email: string;
    name: string;
    phone: string;
    role: string;
  }>;
  saveMessage: boolean;
  sendEmail: boolean;
  sendSms: boolean;
};

function AddRecipientsDialog({
  isSaving,
  onOpenChange,
  onSubmit,
  open,
  template,
}: {
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddRecipientsFormValue) => void;
  open: boolean;
  template: TemplateResponse;
}) {
  const templateRoles = template.submitters
    .map((submitter) => submitter.name)
    .filter((role): role is string => Boolean(role));
  const roles = templateRoles.length ? templateRoles : ["First Party"];
  const [name, setName] = useState("");
  const [order, setOrder] = useState<"preserved" | "random">("preserved");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [customMessage, setCustomMessage] = useState(false);
  const [saveMessage, setSaveMessage] = useState(false);
  const [messageSubject, setMessageSubject] = useState(
    getRequestEmailSubject(template),
  );
  const [messageBody, setMessageBody] = useState(getRequestEmailBody(template));
  const [recipients, setRecipients] = useState(
    roles
      .slice(0, 1)
      .map((role) => ({ email: "", name: "", phone: "", role })),
  );

  function updateRecipient(
    index: number,
    nextRecipient: Partial<(typeof recipients)[number]>,
  ) {
    setRecipients((current) =>
      current.map((recipient, recipientIndex) =>
        recipientIndex === index
          ? { ...recipient, ...nextRecipient }
          : recipient,
      ),
    );
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedRecipients = recipients
      .map((recipient) => ({
        ...recipient,
        email: recipient.email.trim(),
        name: recipient.name.trim(),
        phone: recipient.phone.trim(),
      }))
      .filter((recipient) => recipient.email || recipient.phone);

    if (!normalizedRecipients.length) {
      toast.error("Add at least one recipient email or phone");
      return;
    }

    onSubmit({
      customMessage,
      messageBody: messageBody.trim(),
      messageSubject: messageSubject.trim(),
      name: name.trim(),
      order,
      recipients: normalizedRecipients,
      saveMessage,
      sendEmail,
      sendSms,
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl rounded-3xl bg-[var(--auth-background)] p-0 text-[var(--auth-foreground)]">
        <form onSubmit={submitForm}>
          <DialogHeader className="border-b border-[var(--auth-border)] px-7 py-6">
            <DialogTitle className="text-2xl font-semibold">
              Add recipients
            </DialogTitle>
            <DialogDescription>
              Create a signature request from this template.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[70vh] flex-col gap-6 overflow-y-auto px-7 py-6">
            <div className="grid gap-2">
              <Label htmlFor="submission-name">Submission name</Label>
              <Input
                className="h-12 rounded-full border-[var(--auth-input-border)] px-5 shadow-none focus-visible:ring-0"
                id="submission-name"
                onChange={(event) => setName(event.target.value)}
                placeholder={template.name}
                value={name}
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-4">
                <Label>Recipients</Label>
                <Button
                  className="h-9 rounded-full px-4 text-xs font-bold"
                  onClick={() =>
                    setRecipients((current) => [
                      ...current,
                      { email: "", name: "", phone: "", role: roles[0] },
                    ])
                  }
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  Add
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {recipients.map((recipient, index) => (
                  <div
                    className="grid gap-3 rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-muted)] p-3 md:grid-cols-[1fr_1fr_1fr_150px_auto]"
                    key={`${recipient.role}-${index}`}
                  >
                    <Input
                      className="h-11 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        updateRecipient(index, { email: event.target.value })
                      }
                      placeholder="email@example.com"
                      type="email"
                      value={recipient.email}
                    />
                    <Input
                      className="h-11 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        updateRecipient(index, { name: event.target.value })
                      }
                      placeholder="Name"
                      value={recipient.name}
                    />
                    <Input
                      className="h-11 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        updateRecipient(index, { phone: event.target.value })
                      }
                      placeholder="+1 555 0100"
                      type="tel"
                      value={recipient.phone}
                    />
                    <Select
                      onValueChange={(role) => updateRecipient(index, { role })}
                      value={recipient.role}
                    >
                      <SelectTrigger className="h-11 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      aria-label="Remove recipient"
                      className="size-11 rounded-full"
                      disabled={recipients.length === 1}
                      onClick={() =>
                        setRecipients((current) =>
                          current.filter(
                            (_, recipientIndex) => recipientIndex !== index,
                          ),
                        )
                      }
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon data-icon="icon-only" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-muted)] p-4 md:grid-cols-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Send email</span>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Send SMS</span>
                <Switch checked={sendSms} onCheckedChange={setSendSms} />
              </label>
              <div className="grid gap-1.5">
                <Label>Signing order</Label>
                <Select
                  onValueChange={(value) =>
                    setOrder(value as "preserved" | "random")
                  }
                  value={order}
                >
                  <SelectTrigger className="h-10 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preserved">Preserved</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--auth-border)] bg-[var(--auth-muted)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-white text-[var(--auth-primary)]">
                    <MessageSquareTextIcon data-icon="icon-only" />
                  </span>
                  <div>
                    <p className="font-semibold">Message</p>
                    <p className="text-sm text-[var(--auth-muted-foreground)]">
                      Customize the signature request email copy.
                    </p>
                  </div>
                </div>
                <Button
                  className="h-9 rounded-full px-4 text-xs font-bold"
                  onClick={() => setCustomMessage((current) => !current)}
                  type="button"
                  variant="outline"
                >
                  {customMessage ? "Hide" : "Edit message"}
                </Button>
              </div>

              {customMessage ? (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="recipient-message-subject">Subject</Label>
                    <Input
                      className="h-11 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none focus-visible:ring-0"
                      id="recipient-message-subject"
                      onChange={(event) =>
                        setMessageSubject(event.target.value)
                      }
                      required
                      value={messageSubject}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="recipient-message-body">Body</Label>
                    <textarea
                      className="min-h-40 resize-y rounded-3xl border border-[var(--auth-input-border)] bg-white px-5 py-4 text-sm shadow-none outline-none focus:ring-0"
                      id="recipient-message-body"
                      onChange={(event) => setMessageBody(event.target.value)}
                      required
                      value={messageBody}
                    />
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                    <span className="text-sm font-semibold">
                      Save as default template message
                    </span>
                    <Switch
                      checked={saveMessage}
                      onCheckedChange={setSaveMessage}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t border-[var(--auth-border)] px-7 py-5">
            <Button
              className="h-11 rounded-full px-6 font-bold"
              disabled={isSaving}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-full bg-[var(--auth-primary)] px-6 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={isSaving}
              type="submit"
            >
              <SendIcon data-icon="inline-start" />
              {isSaving ? "Sending..." : "Add recipients"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateSubmissionsEmptyState({
  isOpeningSelfSign,
  isSendingRecipients,
  onSendRecipients,
  onSignYourself,
}: {
  isOpeningSelfSign: boolean;
  isSendingRecipients: boolean;
  onSendRecipients: () => void;
  onSignYourself: () => void;
}) {
  return (
    <section className="flex min-h-[332px] items-center justify-center rounded-2xl bg-[var(--auth-muted)] px-5 py-14">
      <div className="flex w-full max-w-[350px] flex-col items-stretch text-center">
        <h2 className="text-3xl font-bold tracking-normal text-[var(--auth-primary)]">
          There are no Submissions
        </h2>
        <p className="mt-5 text-base text-[var(--auth-foreground)]">
          Send an invitation to fill and complete the form
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Button
            className="h-12 rounded-full bg-[var(--auth-primary)] px-8 text-sm font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
            disabled={isSendingRecipients}
            onClick={onSendRecipients}
            type="button"
          >
            <PlusIcon data-icon="inline-start" />
            SEND TO RECIPIENTS
          </Button>
          <Button
            className="h-12 rounded-full border-2 border-[var(--auth-primary)] bg-transparent px-8 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
            disabled={isOpeningSelfSign}
            onClick={onSignYourself}
            type="button"
            variant="outline"
          >
            {isOpeningSelfSign ? (
              <Spinner className="size-4" />
            ) : (
              <PenLineIcon data-icon="inline-start" />
            )}
            {isOpeningSelfSign ? "OPENING" : "SIGN IT YOURSELF"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function TemplateDetailTopbar() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        aria-label="Signa"
        className="relative block h-16 w-32"
        href="/templates"
      >
        <Image
          alt="Signa"
          className="object-contain object-left"
          fill
          priority
          sizes="128px"
          src="/images/logo.png"
        />
      </Link>
      <nav className="flex items-center gap-4 text-base font-bold">
        <Button className="h-8 rounded-full bg-[var(--auth-upgrade)] px-4 text-xs font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-upgrade-hover)]">
          UPGRADE
        </Button>
        <span className="text-[var(--auth-primary)]/70">|</span>
        <Link href="/settings/account">Settings</Link>
        <ThemeModeSwitcher />
        <UserMenu />
      </nav>
    </header>
  );
}

function ExportSubmissionsDialog({
  onOpenChange,
  open,
  submissions,
  template,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  submissions: SubmissionResponse[];
  template: TemplateResponse;
}) {
  const [status, setStatus] = useState<
    "all" | "pending" | "completed" | "declined" | "expired"
  >("all");
  const filteredSubmissions = useMemo(
    () =>
      status === "all"
        ? submissions
        : submissions.filter((submission) => submission.status === status),
    [status, submissions],
  );

  async function downloadExport(format: "csv" | "xlsx") {
    try {
      const file = await downloadTemplateSubmissionsExport({
        format,
        status: status === "all" ? undefined : status,
        template_id: template.id,
      });
      const href = URL.createObjectURL(file.blob);
      const link = document.createElement("a");

      link.href = href;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(href);
      toast.success(`${format.toUpperCase()} export started`);
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg rounded-3xl bg-[var(--auth-background)] text-[var(--auth-foreground)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Export</DialogTitle>
          <DialogDescription>
            Download submissions for this template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              onValueChange={(value) =>
                setStatus(
                  value as
                    | "all"
                    | "pending"
                    | "completed"
                    | "declined"
                    | "expired",
                )
              }
              value={status}
            >
              <SelectTrigger className="h-12 rounded-full border-[var(--auth-input-border)] px-5 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All submissions</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Button
              className="h-auto justify-start rounded-2xl border-[var(--auth-border)] p-4 text-left"
              onClick={() => void downloadExport("xlsx")}
              type="button"
              variant="outline"
            >
              <FileSpreadsheetIcon className="mr-3 size-10 shrink-0 text-[var(--auth-primary)]" />
              <span className="grid gap-1">
                <span className="text-lg font-semibold">XLSX</span>
                <span className="text-sm font-normal text-[var(--auth-muted-foreground)]">
                  Primarily opened with Microsoft Excel, Google Sheets,
                  LibreOffice Calc, and OpenOffice Calc.
                </span>
              </span>
            </Button>

            <Button
              className="h-auto justify-start rounded-2xl border-[var(--auth-border)] p-4 text-left"
              onClick={() => void downloadExport("csv")}
              type="button"
              variant="outline"
            >
              <DownloadIcon className="mr-3 size-10 shrink-0 text-[var(--auth-primary)]" />
              <span className="grid gap-1">
                <span className="text-lg font-semibold">CSV</span>
                <span className="text-sm font-normal text-[var(--auth-muted-foreground)]">
                  Can be opened with Excel, Google Sheets, or any text editor.
                </span>
              </span>
            </Button>
          </div>

          <p className="text-sm text-[var(--auth-muted-foreground)]">
            {filteredSubmissions.length} submission
            {filteredSubmissions.length === 1 ? "" : "s"} match this export.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getRequestEmailSubject(template: TemplateResponse): string {
  const subject = template.preferences.request_email_subject;

  return typeof subject === "string" && subject.trim()
    ? subject
    : "You are invited to sign a document";
}

function getRequestEmailBody(template: TemplateResponse): string {
  const body = template.preferences.request_email_body;

  return typeof body === "string" && body.trim()
    ? body
    : `Hi there,

You have been invited to sign the "{template.name}".

Review and Sign

Please contact us by replying to this email if you have any questions.

Thanks,
{account.name}`;
}

function TemplateDetailLoading() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Spinner />
        Loading template
      </div>
    </main>
  );
}
