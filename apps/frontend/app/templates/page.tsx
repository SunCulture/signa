"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import {
  ArchiveIcon,
  CalendarDaysIcon,
  CopyIcon,
  FileTextIcon,
  FolderInputIcon,
  Grid3X3Icon,
  ListIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  type LucideIcon,
  PencilIcon,
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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/http";
import {
  archiveTemplate,
  cloneTemplate,
  createTemplateFromDocument,
  deleteTemplatePermanently,
  listTemplates,
  type TemplateResponse,
  updateTemplate,
} from "@/lib/api/templates";
import { cn } from "@/lib/utils";
import { TemplateUploadDropzone } from "./_components/template-upload-dropzone";
import { ThemeModeSwitcher } from "./_components/theme-mode-switcher";
import { UserMenu } from "./_components/user-menu";

type PendingDelete = {
  mode: "archive" | "delete";
  template: TemplateResponse;
};

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesPageFallback />}>
      <TemplatesDashboard />
    </Suspense>
  );
}

function TemplatesDashboard() {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [templateUrlState, setTemplateUrlState] = useQueryStates(
    {
      archived: parseAsBoolean.withDefault(false),
      q: parseAsString.withDefault(""),
    },
    {
      history: "push",
      shallow: true,
    },
  );
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState(templateUrlState.q);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const isArchivedView = templateUrlState.archived;
  const submittedQuery = templateUrlState.q;

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArchivedView, submittedQuery]);

  async function loadTemplates() {
    setIsLoading(true);

    try {
      const response = await listTemplates({
        archived: isArchivedView,
        limit: 100,
        q: submittedQuery || undefined,
      });

      setTemplates(response.data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login");
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Templates could not be loaded.";

      toast.error("Templates could not be loaded", { description: message });
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadTemplate(file: File) {
    setIsUploading(true);
    toast.loading("Uploading document", {
      description: file.name,
      id: "template-upload",
    });

    try {
      const template = await createTemplateFromDocument(file);

      toast.success("Document uploaded", {
        description: "Opening template editor.",
        id: "template-upload",
      });
      router.push(`/templates/${template.id}/edit`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Document upload failed.";

      toast.error("Document upload failed", {
        description: message,
        id: "template-upload",
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function moveTemplate(template: TemplateResponse) {
    const folderName = window.prompt("Move to folder", template.folder_name);

    if (!folderName || folderName === template.folder_name) {
      return;
    }

    try {
      await updateTemplate(template.id, { folder_name: folderName });
      toast.success("Template moved", { description: folderName });
      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Template could not be moved.";

      toast.error("Template move failed", { description: message });
    }
  }

  async function restoreTemplate(template: TemplateResponse) {
    try {
      await updateTemplate(template.id, { archived: false });
      toast.success("Template restored", { description: template.name });
      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Template could not be restored.";

      toast.error("Template restore failed", { description: message });
    }
  }

  async function duplicateTemplate(template: TemplateResponse) {
    const cloneName = `${template.name} (Clone)`;

    toast.loading("Cloning template", {
      description: template.name,
      id: `template-clone-${template.id}`,
    });

    try {
      const clonedTemplate = await cloneTemplate(template.id, {
        name: cloneName,
      });

      toast.success("Template cloned", {
        description: clonedTemplate.name,
        id: `template-clone-${template.id}`,
      });

      if (isArchivedView) {
        await setTemplateUrlState({ archived: false });
        return;
      }

      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Template could not be cloned.";

      toast.error("Template clone failed", {
        description: message,
        id: `template-clone-${template.id}`,
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    const { mode, template } = pendingDelete;

    try {
      if (mode === "delete") {
        await deleteTemplatePermanently(template.id);
        toast.success("Template deleted", { description: template.name });
      } else {
        await archiveTemplate(template.id);
        toast.success("Template archived", { description: template.name });
      }

      setPendingDelete(null);
      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Template action failed.";

      toast.error(
        mode === "delete"
          ? "Template delete failed"
          : "Template archive failed",
        { description: message },
      );
    }
  }

  return (
    <TooltipProvider>
      <main className="min-h-svh bg-[var(--auth-background)] text-[var(--auth-foreground)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-4 md:px-2">
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
              <Button
                className="h-8 rounded-full bg-[var(--auth-upgrade)] px-4 text-xs font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-upgrade-hover)]"
                size="sm"
                type="button"
              >
                UPGRADE
              </Button>
              <span className="text-[var(--auth-primary)]/70">|</span>
              <Link
                className="flex items-center gap-2 transition-colors hover:text-[var(--auth-primary)]"
                href="/settings/account"
              >
                <SettingsIcon data-icon="inline-start" />
                Settings
              </Link>
              <ThemeModeSwitcher />
              <UserMenu />
            </nav>
          </header>

          <Tabs defaultValue="grid">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="flex items-center rounded-2xl bg-[var(--auth-muted)] p-1">
                  <TabsList className="h-10 rounded-xl bg-transparent p-0">
                    <TabsTrigger
                      aria-label="Grid view"
                      className="min-w-9 rounded-xl data-active:bg-[var(--auth-primary)] data-active:text-[var(--auth-primary-foreground)]"
                      value="grid"
                    >
                      <Grid3X3Icon data-icon="inline-start" />
                    </TabsTrigger>
                    <TabsTrigger
                      aria-label="List view"
                      className="min-w-9 rounded-xl data-active:bg-card data-active:text-[var(--auth-primary)]"
                      value="list"
                    >
                      <ListIcon data-icon="inline-start" />
                    </TabsTrigger>
                  </TabsList>
                  <div className="mx-1 h-6 w-px bg-[var(--auth-input-border)]" />
                  <ToggleGroup
                    className="gap-1"
                    onValueChange={(value) => {
                      if (value) {
                        void setTemplateUrlState({
                          archived: value === "archived",
                        });
                      }
                    }}
                    type="single"
                    value={isArchivedView ? "archived" : "active"}
                  >
                    <ToggleGroupItem
                      aria-label="Active templates"
                      className="h-10 rounded-xl px-3 text-xs font-bold data-[state=on]:bg-card data-[state=on]:text-[var(--auth-primary)]"
                      value="active"
                    >
                      <Grid3X3Icon data-icon="inline-start" />
                      ACTIVE
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      aria-label="Archived templates"
                      className="h-10 rounded-xl px-3 text-xs font-bold data-[state=on]:bg-card data-[state=on]:text-[var(--auth-primary)]"
                      value="archived"
                    >
                      <ArchiveIcon data-icon="inline-start" />
                      ARCHIVED
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <h1 className="truncate text-[2rem] font-semibold leading-tight tracking-normal">
                  {isArchivedView ? "Archived Templates" : "Document Templates"}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <form
                  className="relative w-full min-w-56 sm:w-72"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void setTemplateUrlState({ q: query.trim() });
                  }}
                >
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--auth-label)]" />
                  <Input
                    className="h-10 rounded-full border-[var(--auth-input-border)] bg-card pl-9"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search templates"
                    value={query}
                  />
                </form>

                <input
                  accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void uploadTemplate(file);
                    }

                    event.target.value = "";
                  }}
                  ref={uploadInputRef}
                  type="file"
                />
                <Button
                  className="h-12 rounded-full px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)] hover:text-[var(--auth-primary-hover)]"
                  disabled={isUploading}
                  onClick={() => uploadInputRef.current?.click()}
                  type="button"
                  variant="ghost"
                >
                  {isUploading ? (
                    <Spinner />
                  ) : (
                    <UploadIcon data-icon="inline-start" />
                  )}
                  UPLOAD
                </Button>
                <Button
                  className="h-12 rounded-full border-[var(--auth-primary)] bg-transparent px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
                  onClick={() =>
                    toast.info("Blank template creation is not wired yet", {
                      description:
                        "Upload a PDF/DOCX now; blank-template setup will come with the builder workflow.",
                    })
                  }
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  CREATE
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-8">
              {isLoading ? (
                <TemplatesLoadingState />
              ) : templates.length === 0 ? (
                <TemplatesEmptyState
                  isArchivedView={isArchivedView}
                  query={submittedQuery}
                />
              ) : (
                <>
                  <TabsContent className="mt-0" value="grid">
                    <div className="grid gap-4 md:grid-cols-3">
                      {templates.map((template) => (
                        <TemplateCard
                          isArchivedView={isArchivedView}
                          key={template.id}
                          onArchive={() =>
                            setPendingDelete({ mode: "archive", template })
                          }
                          onClone={() => void duplicateTemplate(template)}
                          onDelete={() =>
                            setPendingDelete({ mode: "delete", template })
                          }
                          onMove={() => void moveTemplate(template)}
                          onRestore={() => void restoreTemplate(template)}
                          template={template}
                        />
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent className="mt-0" value="list">
                    <div className="flex flex-col gap-3">
                      {templates.map((template) => (
                        <TemplateListRow
                          isArchivedView={isArchivedView}
                          key={template.id}
                          onArchive={() =>
                            setPendingDelete({ mode: "archive", template })
                          }
                          onClone={() => void duplicateTemplate(template)}
                          onDelete={() =>
                            setPendingDelete({ mode: "delete", template })
                          }
                          onMove={() => void moveTemplate(template)}
                          onRestore={() => void restoreTemplate(template)}
                          template={template}
                        />
                      ))}
                    </div>
                  </TabsContent>
                </>
              )}

              {!isArchivedView && <TemplateUploadDropzone />}
            </section>
          </Tabs>
        </div>
      </main>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        open={Boolean(pendingDelete)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {pendingDelete?.mode === "delete"
              ? "Delete template permanently?"
              : "Archive template?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pendingDelete?.mode === "delete"
              ? "This permanently removes the template. This action cannot be undone."
              : "Archived templates are hidden from the active dashboard and can be restored later."}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              variant={
                pendingDelete?.mode === "delete" ? "destructive" : "default"
              }
            >
              {pendingDelete?.mode === "delete" ? "Delete" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function TemplatesPageFallback() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Spinner />
        Loading templates
      </div>
    </main>
  );
}

function TemplateCard({
  isArchivedView,
  onArchive,
  onClone,
  onDelete,
  onMove,
  onRestore,
  template,
}: TemplateActionProps) {
  return (
    <article className="group relative h-36">
      <Link
        className="flex h-full flex-col justify-between rounded-2xl bg-[var(--auth-muted)] px-7 pb-6 pt-6 transition-colors before:absolute before:inset-0 before:hidden before:rounded-2xl before:border-2 before:border-dashed before:border-[var(--auth-input-border)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_4%)]"
        href={`/templates/${template.id}`}
      >
        <h2 className="line-clamp-2 text-xl font-semibold leading-[1.6rem] tracking-normal">
          {template.name}
        </h2>
        <TemplateMetadata template={template} />
      </Link>

      <div className="absolute bottom-0 right-9 top-0 hidden w-0 items-center md:group-hover:flex">
        <div className="flex flex-col gap-1">
          {isArchivedView ? (
            <>
              <TemplateActionButton
                icon={RotateCcwIcon}
                label="Restore"
                onClick={onRestore}
              />
              <TemplateActionButton
                destructive
                icon={Trash2Icon}
                label="Delete"
                onClick={onDelete}
              />
            </>
          ) : (
            <>
              <TemplateActionButton
                icon={FolderInputIcon}
                label="Move"
                onClick={onMove}
              />
              <TemplateActionButton
                href={`/templates/${template.id}/edit`}
                icon={PencilIcon}
                label="Edit"
              />
              <TemplateActionButton
                icon={CopyIcon}
                label="Clone"
                onClick={onClone}
              />
              <TemplateActionButton
                icon={ArchiveIcon}
                label="Archive"
                onClick={onArchive}
              />
            </>
          )}
        </div>
      </div>
    </article>
  );
}

type TemplateActionProps = {
  isArchivedView: boolean;
  onArchive: () => void;
  onClone: () => void;
  onDelete: () => void;
  onMove: () => void;
  onRestore: () => void;
  template: TemplateResponse;
};

function TemplateListRow({
  isArchivedView,
  onArchive,
  onClone,
  onDelete,
  onMove,
  onRestore,
  template,
}: TemplateActionProps) {
  return (
    <article className="flex min-h-[86px] overflow-hidden rounded-2xl bg-[var(--auth-muted)]">
      <Link
        className="flex w-60 shrink-0 flex-col justify-center gap-2 bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_5%)] px-5 py-3 hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)]"
        href={`/templates/${template.id}`}
      >
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <FileTextIcon data-icon="inline-start" />
          <span className="truncate">{template.name}</span>
        </h2>
        <TemplateMetadata compact template={template} />
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-6 px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <span
            className={cn(
              "rounded-full px-6 py-1 text-xs font-bold uppercase",
              isArchivedView
                ? "bg-[var(--auth-label)]/20 text-[var(--auth-primary)]"
                : "bg-[var(--status-success)] text-[var(--status-success-foreground)]",
            )}
          >
            {isArchivedView ? "Archived" : "Active"}
          </span>
          <span className="truncate text-base">{template.folder_name}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isArchivedView ? (
            <>
              <Button
                className="h-8 rounded-full border-[var(--auth-primary)] px-5 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
                onClick={onRestore}
                type="button"
                variant="outline"
              >
                <RotateCcwIcon data-icon="inline-start" />
                RESTORE
              </Button>
              <Button
                aria-label="Delete"
                className="rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={onDelete}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Trash2Icon data-icon="inline-start" />
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-8 rounded-full border-[var(--auth-primary)] px-5 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
                onClick={onMove}
                type="button"
                variant="outline"
              >
                <FolderInputIcon data-icon="inline-start" />
                MOVE
              </Button>
              <Button
                className="h-8 rounded-full bg-[var(--auth-primary)] px-5 text-sm font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
                asChild
                type="button"
              >
                <Link href={`/templates/${template.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  EDIT
                </Link>
              </Button>
              <Button
                aria-label="Clone"
                className="rounded-full border-[var(--auth-primary)] text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
                onClick={onClone}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <CopyIcon data-icon="inline-start" />
              </Button>
              <Button
                aria-label="Archive"
                className="rounded-full border-[var(--auth-primary)] text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
                onClick={onArchive}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <ArchiveIcon data-icon="inline-start" />
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function TemplateMetadata({
  compact,
  template,
}: {
  compact?: boolean;
  template: TemplateResponse;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-[var(--auth-label)]">
      <span className="flex items-center gap-1.5">
        <UserRoundIcon className="size-4" />
        <span className="truncate">{getAuthorName(template)}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <CalendarDaysIcon className="size-4" />
        <span>{formatTemplateDate(template.created_at)}</span>
        {!compact && template.archived_at ? (
          <span className="ml-2 rounded-full bg-[var(--auth-label)]/15 px-2 py-0.5 text-[10px] font-bold uppercase">
            Archived
          </span>
        ) : null}
      </span>
    </div>
  );
}

function TemplateActionButton({
  destructive,
  href,
  icon: Icon,
  label,
  onClick,
}: {
  destructive?: boolean;
  href?: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  const className = cn(
    "rounded-full border-transparent bg-[var(--auth-muted)] shadow-sm hover:border-[var(--auth-primary)] hover:bg-card",
    destructive ? "text-destructive" : "text-[var(--auth-primary)]",
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button
            aria-label={label}
            asChild
            className={className}
            size="icon-xs"
            variant="outline"
          >
            <Link href={href}>
              <Icon data-icon="inline-start" />
            </Link>
          </Button>
        ) : (
          <Button
            aria-label={label}
            className={className}
            onClick={onClick}
            size="icon-xs"
            type="button"
            variant="outline"
          >
            <Icon data-icon="inline-start" />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}

function TemplatesLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="flex h-36 animate-pulse flex-col justify-between rounded-2xl bg-[var(--auth-muted)] px-7 pb-6 pt-6"
          key={index}
        >
          <div className="h-5 w-3/4 rounded bg-[var(--auth-label)]/20" />
          <div className="space-y-2">
            <div className="h-3 w-1/2 rounded bg-[var(--auth-label)]/15" />
            <div className="h-3 w-1/3 rounded bg-[var(--auth-label)]/15" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplatesEmptyState({
  isArchivedView,
  query,
}: {
  isArchivedView: boolean;
  query: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--auth-input-border)] px-6 py-12 text-center">
      <p className="text-2xl font-semibold">
        {query
          ? "Templates not found"
          : isArchivedView
            ? "No archived templates"
            : "No templates yet"}
      </p>
      <p className="mt-2 text-sm text-[var(--auth-label)]">
        {isArchivedView
          ? "Archived templates will appear here after you archive one."
          : "Upload a PDF or DOCX to start building a signing template."}
      </p>
    </div>
  );
}

function getAuthorName(template: TemplateResponse): string {
  const name = [template.author.first_name, template.author.last_name]
    .filter(Boolean)
    .join(" ");

  return name || template.author.email;
}

function formatTemplateDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}
