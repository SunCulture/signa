"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  CopyIcon,
  DownloadIcon,
  FolderIcon,
  LinkIcon,
  PencilIcon,
  PenLineIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
} from "@/components/reui/timeline";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { getAuthSession } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import {
  archiveSubmission,
  createSubmission,
  downloadTemplateSubmissionsExport,
  listSubmissions,
  type SubmissionResponse,
} from "@/lib/api/submissions";
import { listTeams, type Team } from "@/lib/api/teams";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime-events";
import {
  archiveTemplate,
  cloneTemplate,
  getTemplate,
  getTemplateEvents,
  type TemplateEventResponse,
  type TemplateResponse,
  updateTemplate,
  updateTemplatePreferences,
  updateTemplateTestingSharing,
} from "@/lib/api/templates";
import { ConsoleHeader } from "../_components/console-header";
import { TemplateActionButton } from "./template-detail-action-button";
import { TemplateDetailSendRecipientsDialog } from "./template-detail-send-recipients-dialog";
import { TemplatePreferencesDialog } from "./edit/template-preferences-dialog";
import { TemplateSubmissionRow } from "./template-submission-row";

type TemplateDetailPageProps = {
  templateId: string;
};

export function TemplateDetailPage({ templateId }: TemplateDetailPageProps) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [templateEvents, setTemplateEvents] = useState<TemplateEventResponse[]>(
    [],
  );
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);
  const [isCloneOpen, setIsCloneOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isUpdatingSharedLink, setIsUpdatingSharedLink] = useState(false);
  const [isOpeningSelfSign, setIsOpeningSelfSign] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneTeamId, setCloneTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);

  const fetchTemplateDetail = useCallback(async () => {
    const [templateResponse, submissionsResponse, eventsResponse] =
      await Promise.all([
      getTemplate(templateId),
      listSubmissions({
        include: "fields",
        limit: 100,
        template_id: templateId,
      }),
      getTemplateEvents(templateId),
    ]);

    return { eventsResponse, submissionsResponse, templateResponse };
  }, [templateId]);

  const refreshTemplateDetail = useCallback(async () => {
    try {
      const { eventsResponse, submissionsResponse, templateResponse } =
        await fetchTemplateDetail();

      setTemplate(templateResponse);
      setSubmissions(submissionsResponse.data);
      setTemplateEvents(eventsResponse.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login");
      }
    }
  }, [fetchTemplateDetail, router]);

  useRealtimeEvents({
    enabled: Boolean(template),
    onEvent: () => {
      void refreshTemplateDetail();
    },
    scope: "template",
    templateId,
  });

  async function loadTemplateDetail() {
    setIsLoading(true);

    try {
      const { eventsResponse, submissionsResponse, templateResponse } =
        await fetchTemplateDetail();

      setTemplate(templateResponse);
      setSubmissions(submissionsResponse.data);
      setTemplateEvents(eventsResponse.data);
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
        const { eventsResponse, submissionsResponse, templateResponse } =
          await fetchTemplateDetail();

        if (isCancelled) {
          return;
        }

        setTemplate(templateResponse);
        setSubmissions(submissionsResponse.data);
        setTemplateEvents(eventsResponse.data);
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

  useEffect(() => {
    listTeams("active")
      .then((loadedTeams) => {
        setTeams(loadedTeams);
        setCloneTeamId((current) => current || loadedTeams[0]?.id || "");
      })
      .catch(() => setTeams([]));
  }, []);

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
        name: cloneName.trim() || `${template.name} (Clone)`,
        team_id: cloneTeamId || undefined,
      });

      toast.success("Template cloned", { description: clonedTemplate.name });
      setIsCloneOpen(false);
      router.push(`/templates/${clonedTemplate.id}`);
    } catch (error) {
      toast.error("Template clone failed", {
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

  async function updateTemplateTestingShare(sharedWithTestMode: boolean) {
    if (!template) {
      return;
    }

    const previousSharedWithTestMode = template.shared_with_test_mode;

    setTemplate({ ...template, shared_with_test_mode: sharedWithTestMode });
    setIsUpdatingSharedLink(true);

    try {
      const updatedTemplate = await updateTemplateTestingSharing(
        template.id,
        sharedWithTestMode,
      );

      setTemplate(updatedTemplate);
      toast.success(
        sharedWithTestMode
          ? "Template shared with Test mode"
          : "Template unshared from Test mode",
      );
    } catch (error) {
      setTemplate({
        ...template,
        shared_with_test_mode: previousSharedWithTestMode,
      });
      toast.error("Test mode sharing update failed", {
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
    <main
      className="min-h-svh overflow-x-hidden bg-[var(--auth-background)] text-[var(--auth-foreground)]"
      id="main-content"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-4 md:px-2">
        <ConsoleHeader />

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-pretty text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
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

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center md:justify-end">
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
                onClick={() => {
                  setCloneName(`${template.name} (Clone)`);
                  setIsCloneOpen(true);
                }}
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-3xl font-semibold">Submissions</h2>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
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
        <TemplateActivityTimeline events={templateEvents} />
      </div>
      {isPreferencesOpen ? (
        <TemplatePreferencesDialog
          isSaving={isSavingPreferences}
          isUpdatingSharedLink={isUpdatingSharedLink}
          onOpenChange={setIsPreferencesOpen}
          onSave={saveTemplatePreferences}
          onSharedLinkChange={updateTemplateSharedLink}
          onTestingShareChange={updateTemplateTestingShare}
          open={isPreferencesOpen}
          template={template}
        />
      ) : null}
      {isRecipientsOpen ? (
        <TemplateDetailSendRecipientsDialog
          onOpenChange={setIsRecipientsOpen}
          onSent={() => void loadTemplateDetail()}
          open={isRecipientsOpen}
          template={template}
        />
      ) : null}
      {isCloneOpen ? (
        <CloneTemplateDialog
          isSaving={isMutating}
          name={cloneName}
          onNameChange={setCloneName}
          onOpenChange={setIsCloneOpen}
          onSubmit={() => void duplicateTemplate()}
          onTeamChange={setCloneTeamId}
          open={isCloneOpen}
          teamId={cloneTeamId}
          teams={teams}
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

function CloneTemplateDialog({
  isSaving,
  name,
  onNameChange,
  onOpenChange,
  onSubmit,
  onTeamChange,
  open,
  teamId,
  teams,
}: {
  isSaving: boolean;
  name: string;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onTeamChange: (teamId: string) => void;
  open: boolean;
  teamId: string;
  teams: Team[];
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="rounded-3xl bg-[var(--auth-background)] text-[var(--auth-foreground)]">
        <DialogHeader>
          <DialogTitle>Clone Template</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Select onValueChange={onTeamChange} value={teamId}>
            <SelectTrigger className="!h-12 min-h-12 rounded-full border-[var(--auth-input-border)] bg-white px-5 shadow-none">
              <SelectValue placeholder="Select team account" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="h-12 rounded-full border-[var(--auth-input-border)] bg-white px-5"
            onChange={(event) => onNameChange(event.target.value)}
            value={name}
          />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <FolderIcon data-icon="inline-start" />
              <span className="truncate">Default</span>
            </span>
            <button className="underline" type="button">
              Change Folder
            </button>
          </div>
        </div>
        <DialogFooter className="sm:block">
          <Button
            className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
            disabled={isSaving || !name.trim()}
            onClick={onSubmit}
            type="button"
          >
            {isSaving ? "SUBMITTING..." : "SUBMIT"}
          </Button>
        </DialogFooter>
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

function TemplateActivityTimeline({
  events,
}: {
  events: TemplateEventResponse[];
}) {
  if (!events.length) {
    return null;
  }

  const groupedEvents = groupTemplateEvents(events);

  return (
    <section className="rounded-3xl bg-white/55 px-6 py-5">
      <Accordion collapsible type="single">
        <AccordionItem className="border-none" value="activity">
          <AccordionTrigger className="rounded-2xl px-0 py-0 text-left hover:no-underline">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold">Activity</h2>
              <p className="text-sm font-normal text-[var(--auth-muted-foreground)]">
                Template changes and version history for traceability.
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-0 pl-10 pt-6">
            <div className="flex flex-col gap-7">
              {groupedEvents.map((group) => (
                <div className="flex flex-col gap-4" key={group.label}>
                  <h3 className="text-sm font-bold text-[var(--auth-primary)]">
                    {group.label}
                  </h3>
                  <Timeline defaultValue={group.events.length}>
                    {group.events.map((event, index) => (
                      <TemplateActivityItem
                        event={event}
                        index={index}
                        key={event.id}
                      />
                    ))}
                  </Timeline>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

function TemplateActivityItem({
  event,
  index,
}: {
  event: TemplateEventResponse;
  index: number;
}) {
  const actor = getTemplateEventActor(event);
  const changedPaths = Array.isArray(event.data.changed_paths)
    ? event.data.changed_paths.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const initials = getActivityInitials(actor);
  const isUserEvent = Boolean(event.user);

  return (
    <TimelineItem
      className="group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-5"
      step={index + 1}
    >
      <TimelineHeader>
        <TimelineSeparator className="bg-[var(--auth-input-border)] group-data-[orientation=vertical]/timeline:top-2 group-data-[orientation=vertical]/timeline:-left-8 group-data-[orientation=vertical]/timeline:h-[calc(100%-2.25rem)] group-data-[orientation=vertical]/timeline:translate-y-7" />
        <TimelineIndicator className="size-8 overflow-hidden rounded-full border-none bg-transparent group-data-[orientation=vertical]/timeline:-left-8">
          {isUserEvent ? (
            <Avatar className="size-8 border border-[var(--auth-input-border)] bg-white shadow-sm">
              <AvatarFallback className="bg-[var(--auth-primary)] text-xs font-bold text-[var(--auth-primary-foreground)]">
                {initials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--auth-upgrade)] ring-4 ring-white/70">
              <span className="size-2.5 rounded-full bg-[var(--auth-primary)]" />
            </span>
          )}
        </TimelineIndicator>
      </TimelineHeader>
      <TimelineContent className="flex flex-col gap-1 text-[var(--auth-muted-foreground)]">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <strong className="font-semibold text-[var(--auth-primary)]">
            {actor}
          </strong>
          <span>{formatActivityEventType(event.event_type)}</span>
        </div>
        <p className="text-base font-semibold leading-snug text-[var(--auth-primary)]">
          {event.summary}
        </p>
        {changedPaths.length ? (
          <p className="text-sm">Changed {changedPaths.join(", ")}</p>
        ) : null}
        <TimelineDate className="mb-0 mt-0.5 text-xs">
          {formatTemplateEventTime(event.event_timestamp)}
        </TimelineDate>
      </TimelineContent>
    </TimelineItem>
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

        <div className="grid min-w-0 gap-5">
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

          <div className="grid min-w-0 gap-3">
            <Button
              className="grid h-auto min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center justify-start gap-4 rounded-2xl border-[var(--auth-border)] p-4 text-left hover:border-[var(--auth-primary)] hover:bg-card"
              onClick={() => void downloadExport("xlsx")}
              type="button"
              variant="outline"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Image
                  alt=""
                  className="size-10 object-contain"
                  height={40}
                  src="/images/sheets-logo.png"
                  width={40}
                />
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="text-lg font-semibold">XLSX</span>
                <span className="whitespace-normal text-sm font-normal leading-5 text-[var(--auth-muted-foreground)]">
                  Primarily opened with Microsoft Excel, Google Sheets,
                  LibreOffice Calc, and OpenOffice Calc.
                </span>
              </span>
            </Button>

            <Button
              className="grid h-auto min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center justify-start gap-4 rounded-2xl border-[var(--auth-border)] p-4 text-left hover:border-[var(--auth-primary)] hover:bg-card"
              onClick={() => void downloadExport("csv")}
              type="button"
              variant="outline"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Image
                  alt=""
                  className="size-10 object-contain"
                  height={40}
                  src="/images/file-text.png"
                  width={40}
                />
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="text-lg font-semibold">CSV</span>
                <span className="whitespace-normal text-sm font-normal leading-5 text-[var(--auth-muted-foreground)]">
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

function groupTemplateEvents(events: TemplateEventResponse[]): Array<{
  events: TemplateEventResponse[];
  label: string;
}> {
  const groups = new Map<string, TemplateEventResponse[]>();

  for (const event of events) {
    const label = getActivityGroupLabel(new Date(event.event_timestamp));
    groups.set(label, [...(groups.get(label) ?? []), event]);
  }

  return Array.from(groups.entries()).map(([label, groupEvents]) => ({
    events: groupEvents,
    label,
  }));
}

function getActivityGroupLabel(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (date >= startOfToday) {
    return "Today";
  }

  if (date >= startOfWeek) {
    return "This week";
  }

  if (date >= startOfMonth) {
    return "This month";
  }

  return "Older";
}

function formatActivityEventType(value: string): string {
  return value.replace("template.", "").replaceAll(".", " ");
}

function getTemplateEventActor(event: TemplateEventResponse): string {
  if (!event.user) {
    return "System";
  }

  return (
    [event.user.first_name, event.user.last_name].filter(Boolean).join(" ") ||
    event.user.email
  );
}

function getActivityInitials(actor: string): string {
  const parts = actor
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatTemplateEventTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
