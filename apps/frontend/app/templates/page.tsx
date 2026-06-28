"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import {
  ArchiveIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  FolderInputIcon,
  FolderIcon,
  FolderPlusIcon,
  Grid3X3Icon,
  ListIcon,
  MoreVerticalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  type LucideIcon,
  PencilIcon,
  SignatureIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api/http";
import {
  archiveSubmission,
  listSubmissions,
  type SubmissionResponse,
} from "@/lib/api/submissions";
import { listTeams, type Team } from "@/lib/api/teams";
import {
  archiveTemplate,
  addBlankTemplatePage,
  cloneTemplate,
  createTemplate,
  createTemplateFolder,
  createTemplateFromDocument,
  deleteTemplateFolder,
  deleteTemplatePermanently,
  listTemplateFolders,
  listTemplates,
  type DeleteTemplateFolderMode,
  type TemplateFolderResponse,
  type TemplateResponse,
  updateTemplateFolder,
  updateTemplate,
  type BlankTemplatePageSize,
} from "@/lib/api/templates";
import { useRealtimeEvents } from "@/lib/realtime/use-realtime-events";
import { cn } from "@/lib/utils";
import { TemplateUploadDropzone } from "./_components/template-upload-dropzone";
import { ThemeModeSwitcher } from "./_components/theme-mode-switcher";
import { UserMenu } from "./_components/user-menu";

type PendingDelete = {
  mode: "archive" | "delete";
  template: TemplateResponse;
};

type PendingFolderDelete = {
  folder: TemplateFolderResponse;
};

type CloneDialogState = {
  folderName: string;
  name: string;
  teamId: string;
  template: TemplateResponse;
};

type DashboardView = "templates" | "submissions";

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
  const loadSequenceRef = useRef(0);
  const [templateUrlState, setTemplateUrlState] = useQueryStates(
    {
      archived: parseAsBoolean.withDefault(false),
      folder: parseAsString.withDefault(""),
      q: parseAsString.withDefault(""),
      view: parseAsString.withDefault("templates"),
    },
    {
      history: "push",
      shallow: true,
    },
  );
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [folders, setFolders] = useState<TemplateFolderResponse[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState(templateUrlState.q);
  const [folderName, setFolderName] = useState("");
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [createTemplateName, setCreateTemplateName] = useState("");
  const [createPageSize, setCreatePageSize] =
    useState<BlankTemplatePageSize>("letter");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [renameTargetFolder, setRenameTargetFolder] =
    useState<TemplateFolderResponse | null>(null);
  const [moveTargetTemplate, setMoveTargetTemplate] =
    useState<TemplateResponse | null>(null);
  const [moveFolderName, setMoveFolderName] = useState("");
  const [cloneDialog, setCloneDialog] = useState<CloneDialogState | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingFolderDelete, setPendingFolderDelete] =
    useState<PendingFolderDelete | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const isArchivedView = templateUrlState.archived;
  const dashboardView: DashboardView =
    templateUrlState.view === "submissions" ? "submissions" : "templates";
  const selectedFolder = templateUrlState.folder;
  const submittedQuery = templateUrlState.q;
  const visibleFolders = scopeFoldersToParent(folders, selectedFolder);
  const visibleTemplates = isArchivedView
    ? templates
    : scopeTemplatesToFolder(templates, selectedFolder, Boolean(submittedQuery));
  const moveFolderOptions = getMoveFolderOptions(selectedFolder, folders);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardView, isArchivedView, selectedFolder, submittedQuery]);

  useRealtimeEvents({
    onEvent: () => {
      void loadTemplates({ silent: true });
    },
    scope: "account",
  });

  useEffect(() => {
    listTeams("active")
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  async function loadTemplates(options: { silent?: boolean } = {}) {
    const loadSequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = loadSequence;
    const loadParams = {
      dashboardView,
      isArchivedView,
      selectedFolder,
      submittedQuery,
    };

    if (!options.silent) {
      setIsLoading(true);
    }

    try {
      if (loadParams.dashboardView === "submissions") {
        const response = await listSubmissions({
          archived: loadParams.isArchivedView,
          limit: 100,
          q: loadParams.submittedQuery || undefined,
        });

        if (!isCurrentLoad(loadSequenceRef, loadSequence)) {
          return;
        }

        setSubmissions(response.data);
        setTemplates([]);
        setFolders([]);
        return;
      }

      const [response, folderResponse] = await Promise.all([
        listTemplates({
          archived: loadParams.isArchivedView,
          folder: loadParams.selectedFolder || undefined,
          limit: 100,
          q: loadParams.submittedQuery || undefined,
        }),
        loadParams.isArchivedView
          ? Promise.resolve([])
          : listTemplateFolders({
              parent: loadParams.selectedFolder || undefined,
              q: loadParams.submittedQuery || undefined,
            }),
      ]);

      if (!isCurrentLoad(loadSequenceRef, loadSequence)) {
        return;
      }

      setTemplates(
        loadParams.isArchivedView
          ? response.data
          : scopeTemplatesToFolder(
              response.data,
              loadParams.selectedFolder,
              Boolean(loadParams.submittedQuery),
            ),
      );
      setFolders(scopeFoldersToParent(folderResponse, loadParams.selectedFolder));
      setSubmissions([]);
    } catch (error) {
      if (!isCurrentLoad(loadSequenceRef, loadSequence)) {
        return;
      }

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
      if (isCurrentLoad(loadSequenceRef, loadSequence) && !options.silent) {
        setIsLoading(false);
      }
    }
  }

  async function uploadTemplate(file: File) {
    setIsUploading(true);
    toast.loading("Uploading document", {
      description: file.name,
      id: "template-upload",
    });

    try {
      const template = await createTemplateFromDocument(
        file,
        selectedFolder || undefined,
      );

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

  async function createBlankTemplate() {
    const name = createTemplateName.trim() || "Untitled Template";

    setIsCreatingTemplate(true);
    toast.loading("Creating template", {
      description: name,
      id: "template-create",
    });

    try {
      const template = await createTemplate({
        folder_name: selectedFolder || undefined,
        name,
        shared_link: true,
      });

      await addBlankTemplatePage(template.id, {
        name: "Blank Page",
        size: createPageSize,
      });

      toast.success("Template created", {
        description: "Opening template editor.",
        id: "template-create",
      });
      setIsCreateDialogOpen(false);
      setCreateTemplateName("");
      router.push(`/templates/${template.id}/edit`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Template could not be created.";

      toast.error("Template create failed", {
        description: message,
        id: "template-create",
      });
    } finally {
      setIsCreatingTemplate(false);
    }
  }

  function openMoveTemplateDialog(template: TemplateResponse) {
    setMoveTargetTemplate(template);
    setMoveFolderName(template.folder_name);
  }

  async function moveTemplate() {
    if (!moveTargetTemplate) {
      return;
    }

    const folderName = moveFolderName.trim() || "Default";

    if (folderName === moveTargetTemplate.folder_name) {
      setMoveTargetTemplate(null);
      return;
    }

    try {
      await updateTemplate(moveTargetTemplate.id, { folder_name: folderName });
      toast.success("Template moved", { description: folderName });
      setMoveTargetTemplate(null);
      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Template could not be moved.";

      toast.error("Template move failed", { description: message });
    }
  }

  async function createFolder() {
    const name = folderName.trim();

    if (!name) {
      return;
    }

    try {
      await createTemplateFolder({
        name,
        parent: selectedFolder || undefined,
      });
      toast.success("Folder created", { description: name });
      setFolderName("");
      setIsFolderDialogOpen(false);
      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Folder could not be created.";

      toast.error("Folder create failed", { description: message });
    }
  }

  function openRenameFolderDialog(folder: TemplateFolderResponse) {
    setRenameTargetFolder(folder);
    setRenameFolderName(folder.name);
  }

  async function renameFolder() {
    if (!renameTargetFolder) {
      return;
    }

    const name = renameFolderName.trim();

    if (!name || name === renameTargetFolder.name) {
      setRenameTargetFolder(null);
      return;
    }

    try {
      const updatedFolder = await updateTemplateFolder(renameTargetFolder.id, {
        name,
      });

      toast.success("Folder renamed", { description: updatedFolder.full_name });
      setRenameTargetFolder(null);

      if (selectedFolder === renameTargetFolder.full_name) {
        await setTemplateUrlState({ folder: updatedFolder.full_name });
        return;
      }

      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Folder could not be renamed.";

      toast.error("Folder rename failed", { description: message });
    }
  }

  async function deleteFolder(mode: DeleteTemplateFolderMode) {
    if (!pendingFolderDelete) {
      return;
    }

    const folder = pendingFolderDelete.folder;

    try {
      await deleteTemplateFolder(folder.id, mode);
      toast.success("Folder deleted", {
        description:
          mode === "with_contents"
            ? "Folder and documents were archived."
            : "Documents were moved to Default.",
      });
      setPendingFolderDelete(null);

      if (selectedFolder === folder.full_name) {
        await setTemplateUrlState({ folder: "" });
        return;
      }

      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Folder could not be deleted.";

      toast.error("Folder delete failed", { description: message });
    }
  }

  async function archiveSubmissionRow(submission: SubmissionResponse) {
    try {
      await archiveSubmission(submission.id);
      toast.success("Submission archived", {
        description: submission.name ?? submission.template?.name ?? submission.id,
      });
      await loadTemplates();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Submission could not be archived.";

      toast.error("Submission archive failed", { description: message });
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

  function openCloneTemplateDialog(template: TemplateResponse) {
    setCloneDialog({
      folderName: template.folder_name,
      name: `${template.name} (Clone)`,
      teamId: teams[0]?.id ?? "",
      template,
    });
  }

  async function duplicateTemplate() {
    if (!cloneDialog) {
      return;
    }

    const cloneName =
      cloneDialog.name.trim() || `${cloneDialog.template.name} (Clone)`;

    toast.loading("Cloning template", {
      description: cloneDialog.template.name,
      id: `template-clone-${cloneDialog.template.id}`,
    });

    try {
      const clonedTemplate = await cloneTemplate(cloneDialog.template.id, {
        folder_name: cloneDialog.folderName.trim() || "Default",
        name: cloneName,
        team_id: cloneDialog.teamId || undefined,
      });

      toast.success("Template cloned", {
        description: clonedTemplate.name,
        id: `template-clone-${cloneDialog.template.id}`,
      });

      setCloneDialog(null);

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
        id: `template-clone-${cloneDialog.template.id}`,
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

          <div>
            <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <DashboardViewToggle
                  onSelect={(view) => {
                    void setTemplateUrlState({
                      archived: false,
                      folder: view === "submissions" ? "" : selectedFolder,
                      view,
                    });
                  }}
                  value={dashboardView}
                />
                <h1 className="truncate text-[2rem] font-semibold leading-tight tracking-normal">
                  {getDashboardTitle(dashboardView, isArchivedView, selectedFolder)}
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
                    placeholder={
                      dashboardView === "submissions"
                        ? "Search submissions"
                        : "Search templates"
                    }
                    value={query}
                  />
                </form>
                <ToggleGroup
                  className="rounded-2xl bg-[var(--auth-muted)] p-1"
                  onValueChange={(value) => {
                    if (value) {
                      void setTemplateUrlState({
                        archived: value === "archived",
                        folder: value === "archived" ? "" : selectedFolder,
                      });
                    }
                  }}
                  type="single"
                  value={isArchivedView ? "archived" : "active"}
                >
                  <ToggleGroupItem
                    aria-label="Active"
                    className="h-10 rounded-xl px-3 text-xs font-bold data-[state=on]:bg-card data-[state=on]:text-[var(--auth-primary)]"
                    value="active"
                  >
                    ACTIVE
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    aria-label="Archived"
                    className="h-10 rounded-xl px-3 text-xs font-bold data-[state=on]:bg-card data-[state=on]:text-[var(--auth-primary)]"
                    value="archived"
                  >
                    ARCHIVED
                  </ToggleGroupItem>
                </ToggleGroup>

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
                {!isArchivedView && dashboardView === "templates" ? (
                  <Button
                    className="h-12 rounded-full px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)] hover:text-[var(--auth-primary-hover)]"
                    onClick={() => setIsFolderDialogOpen(true)}
                    type="button"
                    variant="ghost"
                  >
                    <FolderPlusIcon data-icon="inline-start" />
                    NEW FOLDER
                  </Button>
                ) : null}
                <Button
                  className="h-12 rounded-full border-[var(--auth-primary)] bg-transparent px-6 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
                  onClick={() => setIsCreateDialogOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <PlusIcon data-icon="inline-start" />
                  CREATE
                </Button>
              </div>
            </section>

            <section className="mt-6 flex flex-col gap-8">
              {!isArchivedView && dashboardView === "templates" && selectedFolder ? (
                <FolderBreadcrumbs
                  folder={selectedFolder}
                  onSelect={(folder) => {
                    void setTemplateUrlState({ folder });
                  }}
                />
              ) : null}
              {isLoading ? (
                <TemplatesLoadingState />
              ) : dashboardView === "submissions" ? (
                submissions.length === 0 ? (
                  <DashboardEmptyState
                    isArchivedView={isArchivedView}
                    query={submittedQuery}
                    view="submissions"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {submissions.map((submission) => (
                      <SubmissionListRow
                        key={submission.id}
                        onArchive={() => void archiveSubmissionRow(submission)}
                        submission={submission}
                      />
                    ))}
                  </div>
                )
              ) : visibleTemplates.length === 0 && visibleFolders.length === 0 ? (
                <TemplatesEmptyState
                  folder={selectedFolder}
                  isArchivedView={isArchivedView}
                  query={submittedQuery}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                      {!isArchivedView
                        ? visibleFolders.map((folder) => (
                            <FolderCard
                              folder={folder}
                              key={folder.id}
                              onDelete={() => setPendingFolderDelete({ folder })}
                              onRename={() => openRenameFolderDialog(folder)}
                              onOpen={() => {
                                void setTemplateUrlState({
                                  folder: folder.full_name,
                                });
                              }}
                            />
                          ))
                        : null}
                      {visibleTemplates.map((template) => (
                        <TemplateCard
                          isArchivedView={isArchivedView}
                          key={template.id}
                          onArchive={() =>
                            setPendingDelete({ mode: "archive", template })
                          }
                          onClone={() => openCloneTemplateDialog(template)}
                          onDelete={() =>
                            setPendingDelete({ mode: "delete", template })
                          }
                          onMove={() => openMoveTemplateDialog(template)}
                          onRestore={() => void restoreTemplate(template)}
                          template={template}
                        />
                      ))}
                </div>
              )}

              {!isArchivedView && <TemplateUploadDropzone />}
            </section>
          </div>
        </div>
      </main>

      <Dialog
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);

          if (!open) {
            setCreateTemplateName("");
            setCreatePageSize("letter");
          }
        }}
        open={isCreateDialogOpen}
      >
        <DialogContent className="border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>Create template</DialogTitle>
            <DialogDescription>
              Start with a blank page and continue in the template builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              autoFocus
              className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
              onChange={(event) => setCreateTemplateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createBlankTemplate();
                }
              }}
              placeholder="Template name"
              value={createTemplateName}
            />
            <Select
              onValueChange={(value) =>
                setCreatePageSize(value as BlankTemplatePageSize)
              }
              value={createPageSize}
            >
              <SelectTrigger className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
              </SelectContent>
            </Select>
            {selectedFolder ? (
              <p className="text-sm text-[var(--auth-label)]">
                This template will be created in {selectedFolder}.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={isCreatingTemplate}
              onClick={() => void createBlankTemplate()}
              type="button"
            >
              {isCreatingTemplate ? <Spinner className="size-4" /> : null}
              CREATE TEMPLATE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setIsFolderDialogOpen(open);

          if (!open) {
            setFolderName("");
          }
        }}
        open={isFolderDialogOpen}
      >
        <DialogContent className="border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>
              {selectedFolder
                ? `Create a folder inside ${selectedFolder}.`
                : "Create a folder next to your default templates."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
            onChange={(event) => setFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void createFolder();
              }
            }}
            placeholder="Folder name"
            value={folderName}
          />
          <DialogFooter>
            <Button
              className="h-11 rounded-full px-6"
              onClick={() => setIsFolderDialogOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-full bg-[var(--auth-primary)] px-7 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={!folderName.trim()}
              onClick={() => void createFolder()}
              type="button"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRenameTargetFolder(null);
            setRenameFolderName("");
          }
        }}
        open={Boolean(renameTargetFolder)}
      >
        <DialogContent className="border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Rename {renameTargetFolder?.full_name ?? "this folder"}.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
            onChange={(event) => setRenameFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void renameFolder();
              }
            }}
            placeholder="Folder name"
            value={renameFolderName}
          />
          <DialogFooter>
            <Button
              className="h-11 rounded-full px-6"
              onClick={() => setRenameTargetFolder(null)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              className="h-11 rounded-full bg-[var(--auth-primary)] px-7 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={!renameFolderName.trim()}
              onClick={() => void renameFolder()}
              type="button"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setMoveTargetTemplate(null);
          }
        }}
        open={Boolean(moveTargetTemplate)}
      >
        <DialogContent className="border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>Move Into Folder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Combobox
              inputValue={moveFolderName}
              items={moveFolderOptions}
              onInputValueChange={setMoveFolderName}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setMoveFolderName(value);
                }
              }}
              value={moveFolderName}
            >
              <ComboboxInput
                autoFocus
                className="h-12 w-full rounded-full border-[var(--auth-input-border)] bg-card px-5"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void moveTemplate();
                  }
                }}
                placeholder="New Folder Name..."
                showTrigger
              />
              <ComboboxContent>
                <ComboboxList>
                  {moveFolderOptions.length > 0 ? (
                    <ComboboxGroup>
                      <ComboboxLabel>Folders</ComboboxLabel>
                      {moveFolderOptions.map((folder) => (
                        <ComboboxItem key={folder} value={folder}>
                          {folder}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  ) : (
                    <ComboboxEmpty>No folders found</ComboboxEmpty>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <DialogFooter className="sm:block">
            <Button
              className="h-12 w-full rounded-full bg-[var(--auth-primary)] px-7 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              onClick={() => void moveTemplate()}
              type="button"
            >
              MOVE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCloneDialog(null);
          }
        }}
        open={Boolean(cloneDialog)}
      >
        <DialogContent className="border-[var(--auth-input-border)] bg-[var(--auth-background)] text-[var(--auth-foreground)]">
          <DialogHeader>
            <DialogTitle>Clone Template</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Select
              onValueChange={(teamId) =>
                setCloneDialog((current) =>
                  current ? { ...current, teamId } : current,
                )
              }
              value={cloneDialog?.teamId}
            >
              <SelectTrigger className="!h-12 min-h-12 w-full rounded-full border-[var(--auth-input-border)] bg-card px-5">
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
              className="h-12 rounded-full border-[var(--auth-input-border)] bg-card px-5"
              onChange={(event) =>
                setCloneDialog((current) =>
                  current ? { ...current, name: event.target.value } : current,
                )
              }
              value={cloneDialog?.name ?? ""}
            />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2">
                <FolderIcon data-icon="inline-start" />
                <span className="truncate">
                  {cloneDialog?.folderName || "Default"}
                </span>
              </span>
              <Combobox
                inputValue={cloneDialog?.folderName ?? ""}
                items={moveFolderOptions}
                onInputValueChange={(folderName) =>
                  setCloneDialog((current) =>
                    current ? { ...current, folderName } : current,
                  )
                }
                onValueChange={(folderName) => {
                  if (typeof folderName === "string") {
                    setCloneDialog((current) =>
                      current ? { ...current, folderName } : current,
                    );
                  }
                }}
                value={cloneDialog?.folderName ?? ""}
              >
                <ComboboxInput
                  className="h-9 w-40 rounded-full border-[var(--auth-input-border)] bg-card px-4"
                  placeholder="Change Folder"
                  showTrigger
                />
                <ComboboxContent>
                  <ComboboxList>
                    {moveFolderOptions.length > 0 ? (
                      <ComboboxGroup>
                        <ComboboxLabel>Folders</ComboboxLabel>
                        {moveFolderOptions.map((folder) => (
                          <ComboboxItem key={folder} value={folder}>
                            {folder}
                          </ComboboxItem>
                        ))}
                      </ComboboxGroup>
                    ) : (
                      <ComboboxEmpty>No folders found</ComboboxEmpty>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
          <DialogFooter className="sm:block">
            <Button
              className="h-12 w-full rounded-full bg-[var(--auth-primary)] px-7 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={!cloneDialog?.name.trim()}
              onClick={() => void duplicateTemplate()}
              type="button"
            >
              SUBMIT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingFolderDelete(null);
          }
        }}
        open={Boolean(pendingFolderDelete)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete folder?</AlertDialogTitle>
          <AlertDialogDescription>
            Choose whether to keep the documents by moving them to Default, or
            archive the folder together with its documents and subfolders.
          </AlertDialogDescription>
          <AlertDialogFooter className="sm:grid sm:grid-cols-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteFolder("folder_only");
              }}
            >
              Delete folder only
            </AlertDialogAction>
            <AlertDialogAction
              className="sm:col-span-2"
              onClick={(event) => {
                event.preventDefault();
                void deleteFolder("with_contents");
              }}
              variant="destructive"
            >
              Delete folder and documents
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function DashboardViewToggle({
  onSelect,
  value,
}: {
  onSelect: (view: DashboardView) => void;
  value: DashboardView;
}) {
  return (
    <div className="flex items-center rounded-2xl bg-[var(--auth-muted)] p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Templates"
            className={cn(
              "h-10 w-10 rounded-xl p-0",
              value === "templates"
                ? "bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
                : "bg-transparent text-[var(--auth-primary)] hover:bg-card",
            )}
            onClick={() => onSelect("templates")}
            type="button"
            variant="ghost"
          >
            <Grid3X3Icon className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Templates</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Submissions"
            className={cn(
              "h-10 w-10 rounded-xl p-0",
              value === "submissions"
                ? "bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
                : "bg-transparent text-[var(--auth-primary)] hover:bg-card",
            )}
            onClick={() => onSelect("submissions")}
            type="button"
            variant="ghost"
          >
            <ListIcon className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Submissions</TooltipContent>
      </Tooltip>
    </div>
  );
}

function FolderBreadcrumbs({
  folder,
  onSelect,
}: {
  folder: string;
  onSelect: (folder: string) => void;
}) {
  const segments = getFolderSegments(folder);

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--auth-label)]">
      <button
        className="rounded-full px-3 py-1.5 transition-colors hover:bg-[var(--auth-muted)] hover:text-[var(--auth-primary)]"
        onClick={() => onSelect("")}
        type="button"
      >
        Templates
      </button>
      {segments.map((segment, index) => (
        <span className="flex items-center gap-2" key={getFolderPath(segments, index)}>
          <ChevronRightIcon className="size-4" />
          <button
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-[var(--auth-muted)] hover:text-[var(--auth-primary)]"
            onClick={() => onSelect(getFolderPath(segments, index))}
            type="button"
          >
            {segment}
          </button>
        </span>
      ))}
    </nav>
  );
}

function FolderCard({
  folder,
  onDelete,
  onOpen,
  onRename,
}: {
  folder: TemplateFolderResponse;
  onDelete: () => void;
  onOpen: () => void;
  onRename: () => void;
}) {
  return (
    <article className="group relative h-36 overflow-hidden rounded-2xl bg-[var(--auth-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_6%)]">
      <button
        className="flex h-full w-full flex-col justify-between px-7 pb-6 pt-6 text-left"
        onClick={onOpen}
        type="button"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-[var(--auth-primary)] shadow-sm">
            <FolderIcon className="size-5 fill-current/10" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xl font-semibold leading-tight tracking-normal">
              {folder.name}
            </span>
            <span className="mt-1 block text-xs text-[var(--auth-label)]">
              {folder.full_name}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3 text-xs font-semibold text-[var(--auth-label)]">
          <span>{folder.templates_count} templates</span>
          <span className="size-1 rounded-full bg-current opacity-40" />
          <span>{folder.subfolders_count} folders</span>
        </span>
      </button>
      <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Folder actions"
              className="rounded-full bg-card text-[var(--auth-primary)] shadow-sm hover:bg-[var(--auth-background)]"
              onClick={(event) => event.stopPropagation()}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreVerticalIcon data-icon="inline-start" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={onRename}>
                <PencilIcon data-icon="inline-start" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} variant="destructive">
                <Trash2Icon data-icon="inline-start" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

function SubmissionListRow({
  onArchive,
  submission,
}: {
  onArchive: () => void;
  submission: SubmissionResponse;
}) {
  const submitter = submission.submitters[0] ?? null;
  const title =
    submission.name ?? submission.template?.name ?? `Submission ${submission.id}`;
  const signer =
    submitter?.name ?? submitter?.email ?? submitter?.phone ?? "Recipient";

  return (
    <article className="flex min-h-[86px] overflow-hidden rounded-2xl bg-[var(--auth-muted)]">
      <Link
        className="flex w-60 shrink-0 flex-col justify-center gap-2 bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_5%)] px-5 py-3 hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)]"
        href={submission.template ? `/templates/${submission.template.id}` : `/submissions/${submission.id}`}
      >
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <FileTextIcon data-icon="inline-start" />
          <span className="truncate">{title}</span>
        </h2>
        <div className="flex flex-col gap-1 text-xs text-[var(--auth-label)]">
          <span className="flex items-center gap-1.5">
            <UserRoundIcon className="size-4" />
            <span className="truncate">
              {getSubmissionAuthor(submission)}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDaysIcon className="size-4" />
            <span>{formatTemplateDate(submission.created_at)}</span>
          </span>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-6 px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <SubmissionStatusBadge submission={submission} />
          <Link
            className="truncate text-lg hover:text-[var(--auth-primary)] hover:underline"
            href={`/submissions/${submission.id}`}
          >
            {signer}
          </Link>
        </div>

        <SubmissionRowActions onArchive={onArchive} submission={submission} />
      </div>
    </article>
  );
}

function SubmissionRowActions({
  onArchive,
  submission,
}: {
  onArchive: () => void;
  submission: SubmissionResponse;
}) {
  const submitter = submission.submitters[0] ?? null;
  const canSign =
    submitter &&
    submission.status === "pending" &&
    !submission.archived_at &&
    !submitter.completed_at &&
    !submitter.declined_at;

  return (
    <div className="flex shrink-0 items-center gap-2">
      {canSign ? <SubmissionSignButton slug={submitter.slug} /> : null}
      {!canSign && submission.status === "completed" ? (
        <SubmissionDownloadButton id={submission.id} />
      ) : null}
      <Button
        className="h-8 rounded-full border-[var(--auth-primary)] px-5 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
        asChild
        type="button"
        variant="outline"
      >
        <Link href={`/submissions/${submission.id}`}>VIEW</Link>
      </Button>
      {!submission.archived_at ? (
        <Button
          aria-label="Archive submission"
          className="rounded-full border-[var(--auth-primary)] text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
          onClick={onArchive}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ArchiveIcon data-icon="inline-start" />
        </Button>
      ) : null}
    </div>
  );
}

function SubmissionSignButton({ slug }: { slug: string }) {
  return (
    <Button
      className="h-8 rounded-full border-[var(--auth-primary)] px-5 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
      asChild
      type="button"
      variant="outline"
    >
      <Link href={`/s/${slug}`} target="_blank">
        <SignatureIcon data-icon="inline-start" />
        SIGN NOW
      </Link>
    </Button>
  );
}

function SubmissionDownloadButton({ id }: { id: string }) {
  return (
    <Button
      className="h-8 rounded-full bg-[var(--auth-primary)] px-5 text-sm font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
      asChild
      type="button"
    >
      <Link href={`/submissions/${id}`}>
        <DownloadIcon data-icon="inline-start" />
        DOWNLOAD
      </Link>
    </Button>
  );
}

function SubmissionStatusBadge({
  submission,
}: {
  submission: SubmissionResponse;
}) {
  const badge = getSubmissionStatusBadge(submission);

  return (
    <span
      className={cn(
        "rounded-full px-6 py-1 text-xs font-bold uppercase",
        badge.className,
      )}
    >
      {badge.label}
    </span>
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
  folder,
  isArchivedView,
  query,
}: {
  folder: string;
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
            : folder
              ? "This folder is empty"
              : "No templates yet"}
      </p>
      <p className="mt-2 text-sm text-[var(--auth-label)]">
        {isArchivedView
          ? "Archived templates will appear here after you archive one."
          : folder
            ? "Create a blank template, upload a document, or create a subfolder here."
            : "Create a blank template or upload a PDF/DOCX to start building."}
      </p>
    </div>
  );
}

function DashboardEmptyState({
  isArchivedView,
  query,
  view,
}: {
  isArchivedView: boolean;
  query: string;
  view: DashboardView;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--auth-input-border)] px-6 py-12 text-center">
      <p className="text-2xl font-semibold">
        {query
          ? view === "submissions"
            ? "Submissions not found"
            : "Templates not found"
          : isArchivedView
            ? `No archived ${view}`
            : view === "submissions"
              ? "No submissions yet"
              : "No templates yet"}
      </p>
      <p className="mt-2 text-sm text-[var(--auth-label)]">
        {view === "submissions"
          ? "Send a template to recipients and submissions will appear here."
          : "Create a blank template or upload a PDF/DOCX to start building."}
      </p>
    </div>
  );
}

function getDashboardTitle(
  view: DashboardView,
  isArchivedView: boolean,
  folder: string,
): string {
  if (view === "submissions") {
    return isArchivedView ? "Archived Submissions" : "Submissions";
  }

  return isArchivedView ? "Archived Templates" : getFolderTitle(folder);
}

function getFolderTitle(folder: string): string {
  return getFolderSegments(folder).at(-1) ?? "Document Templates";
}

function getFolderSegments(folder: string): string[] {
  return folder
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getFolderPath(segments: string[], index: number): string {
  return segments.slice(0, index + 1).join(" / ");
}

function scopeFoldersToParent(
  folders: TemplateFolderResponse[],
  selectedFolder: string,
): TemplateFolderResponse[] {
  const parentSegments = getFolderSegments(selectedFolder);

  if (parentSegments.length === 0) {
    return folders.filter((folder) => getFolderSegments(folder.full_name).length === 1);
  }

  return folders.filter((folder) => {
    const folderSegments = getFolderSegments(folder.full_name);

    if (folderSegments.length !== parentSegments.length + 1) {
      return false;
    }

    return parentSegments.every(
      (segment, index) => folderSegments[index] === segment,
    );
  });
}

function scopeTemplatesToFolder(
  templates: TemplateResponse[],
  selectedFolder: string,
  includeDescendants: boolean,
): TemplateResponse[] {
  const selectedSegments = getFolderSegments(selectedFolder || "Default");

  return templates.filter((template) => {
    const folderSegments = getFolderSegments(template.folder_name);

    if (!includeDescendants) {
      return areFolderSegmentsEqual(folderSegments, selectedSegments);
    }

    return selectedSegments.every(
      (segment, index) => folderSegments[index] === segment,
    );
  });
}

function areFolderSegmentsEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((segment, index) => segment === right[index])
  );
}

function isCurrentLoad(
  loadSequenceRef: { current: number },
  loadSequence: number,
): boolean {
  return loadSequenceRef.current === loadSequence;
}

function getMoveFolderOptions(
  selectedFolder: string,
  folders: TemplateFolderResponse[],
): string[] {
  return Array.from(
    new Set(
      ["Default", selectedFolder, ...folders.map((folder) => folder.full_name)]
        .map((folder) => folder.trim())
        .filter(Boolean),
    ),
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

function getSubmissionAuthor(submission: SubmissionResponse): string {
  const user = submission.created_by_user;
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  return name || user?.email || submission.template?.name || "Unknown";
}

function getSubmissionStatusBadge(submission: SubmissionResponse): {
  className: string;
  label: string;
} {
  if (submission.archived_at) {
    return {
      className: "bg-[var(--auth-label)]/20 text-[var(--auth-primary)]",
      label: "Archived",
    };
  }

  if (submission.status === "completed") {
    return {
      className:
        "bg-[var(--status-success)] text-[var(--status-success-foreground)]",
      label: "Completed",
    };
  }

  if (submission.status === "declined") {
    return {
      className: "bg-destructive/15 text-destructive",
      label: "Declined",
    };
  }

  if (submission.status === "expired") {
    return {
      className: "bg-destructive/15 text-destructive",
      label: "Expired",
    };
  }

  const firstSubmitter = submission.submitters[0];
  const opened = firstSubmitter?.opened_at;

  return {
    className: "bg-[var(--auth-upgrade)] text-[var(--auth-primary)]",
    label: opened ? "Opened" : "Pending",
  };
}
