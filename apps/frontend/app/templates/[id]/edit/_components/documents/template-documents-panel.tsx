"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CloudIcon,
  FilePlus2Icon,
  GitBranchIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  SortDescIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import type { TemplateDocument, TemplateResponse } from "@/lib/api/templates";
import { cn } from "@/lib/utils";
import {
  DocumentThumbnail,
  getDocumentDisplayName,
  normalizeTemplateFields,
  type TemplateEditorField,
} from "../../_lib/template-editor-model";
import { FieldConditionsModal } from "../modals/field-modals";

export function TemplateDocumentsPanel({
  editingDocumentUuid,
  isUploadingDocument,
  onAddDocument,
  onEditDocument,
  onMoveDocument,
  onRenameDocument,
  onRemoveDocument,
  onReplaceDocument,
  onReorderDocumentFields,
  onSelectDocument,
  onUpdateDocumentConditions,
  selectedDocumentUuid,
  template,
}: {
  editingDocumentUuid: string | null;
  isUploadingDocument: boolean;
  onAddDocument: (file: File) => Promise<void>;
  onEditDocument: (uuid: string | null) => void;
  onMoveDocument: (
    document: TemplateDocument,
    direction: -1 | 1,
  ) => Promise<void>;
  onRenameDocument: (document: TemplateDocument, name: string) => Promise<void>;
  onRemoveDocument: (document: TemplateDocument) => Promise<void>;
  onReplaceDocument: (document: TemplateDocument, file: File) => Promise<void>;
  onReorderDocumentFields: (document: TemplateDocument) => Promise<void>;
  onSelectDocument: (uuid: string) => void;
  onUpdateDocumentConditions: (
    document: TemplateDocument,
    conditions: unknown,
  ) => Promise<void>;
  selectedDocumentUuid: string | null;
  template: TemplateResponse;
}) {
  const fields = normalizeTemplateFields(template.fields);

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--auth-input-border)] bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-gutter:stable]">
        <div className="flex flex-col gap-5">
          {template.documents.map((document, index) => (
            <TemplateDocumentCard
              canMoveDown={index < template.documents.length - 1}
              canMoveUp={index > 0}
              document={document}
              isEditingName={document.uuid === editingDocumentUuid}
              isSelected={document.uuid === selectedDocumentUuid}
              key={document.uuid}
              name={getDocumentDisplayName(template, document)}
              onEditName={() => onEditDocument(document.uuid)}
              onEditingNameChange={(isEditing) =>
                onEditDocument(isEditing ? document.uuid : null)
              }
              onMoveDown={() => onMoveDocument(document, 1)}
              onMoveUp={() => onMoveDocument(document, -1)}
              onRename={onRenameDocument}
              onRemove={() => onRemoveDocument(document)}
              onReplace={(file) => onReplaceDocument(document, file)}
              onReorderFields={() => onReorderDocumentFields(document)}
              onSelect={() => onSelectDocument(document.uuid)}
              onUpdateConditions={(conditions) =>
                onUpdateDocumentConditions(document, conditions)
              }
              template={template}
              templateFields={fields}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--auth-input-border)] bg-card/95 p-4 shadow-[0_-12px_24px_-24px_var(--auth-primary)]">
        <AddDocumentMenu
          isUploadingDocument={isUploadingDocument}
          onAddDocument={onAddDocument}
        />
      </div>
    </aside>
  );
}

export function TemplateDocumentCard({
  canMoveDown,
  canMoveUp,
  document,
  isEditingName,
  isSelected,
  name,
  onEditName,
  onEditingNameChange,
  onMoveDown,
  onMoveUp,
  onRename,
  onRemove,
  onReplace,
  onReorderFields,
  onSelect,
  onUpdateConditions,
  template,
  templateFields,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  document: TemplateDocument;
  isEditingName: boolean;
  isSelected: boolean;
  name: string;
  onEditName: () => void;
  onEditingNameChange: (isEditing: boolean) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRename: (document: TemplateDocument, name: string) => Promise<void>;
  onRemove: () => void;
  onReplace: (file: File) => void;
  onReorderFields: () => Promise<void>;
  onSelect: () => void;
  onUpdateConditions: (conditions: unknown) => Promise<void>;
  template: TemplateResponse;
  templateFields: TemplateEditorField[];
}) {
  const [isConditionsOpen, setIsConditionsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "group/thumb relative overflow-hidden rounded border bg-white transition-colors",
          isSelected
            ? "border-[var(--auth-accent)] ring-1 ring-[var(--auth-accent)]"
            : "border-[var(--auth-input-border)] hover:border-[var(--auth-accent)]",
        )}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        onClick={onSelect}
        role="button"
        tabIndex={0}
      >
        <DocumentThumbnail document={document} />
        <DocumentThumbnailOverlay
          canMoveDown={canMoveDown}
          canMoveUp={canMoveUp}
          name={name}
          onCondition={() => setIsConditionsOpen(true)}
          onEditName={onEditName}
          onMoveDown={onMoveDown}
          onMoveUp={onMoveUp}
          onRemove={onRemove}
          onReorderFields={onReorderFields}
          onReplace={onReplace}
        />
      </div>
      <DocumentNameEditor
        document={document}
        isEditing={isEditingName}
        name={name}
        onEditingChange={onEditingNameChange}
        onRename={onRename}
      />
      {isConditionsOpen ? (
        <DocumentConditionsModal
          document={document}
          fields={templateFields}
          name={name}
          onOpenChange={setIsConditionsOpen}
          onSave={onUpdateConditions}
          template={template}
        />
      ) : null}
    </div>
  );
}

export function DocumentThumbnailOverlay({
  canMoveDown,
  canMoveUp,
  name,
  onCondition,
  onEditName,
  onMoveDown,
  onMoveUp,
  onRemove,
  onReorderFields,
  onReplace,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  name: string;
  onCondition: () => void;
  onEditName: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  onReorderFields: () => Promise<void>;
  onReplace: (file: File) => void;
}) {
  const replaceInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute inset-0 flex cursor-pointer justify-between rounded bg-black/0 p-1 transition-colors group-hover/thumb:bg-black/10">
      <input
        accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onReplace(file);
          }

          event.target.value = "";
        }}
        ref={replaceInputRef}
        type="file"
      />

      <div className="w-6" />

      <Button
        className="h-6 rounded bg-[var(--auth-primary)] px-3 text-xs font-bold text-[var(--auth-primary-foreground)] opacity-0 shadow-sm transition-opacity hover:bg-[var(--auth-primary-hover)] group-hover/thumb:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          replaceInputRef.current?.click();
        }}
        type="button"
      >
        REPLACE
      </Button>

      <div className="flex flex-col justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`More options for ${name}`}
              className="size-6 rounded border border-gray-300 bg-white p-0 text-[var(--auth-primary)] opacity-0 shadow-sm transition-opacity hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)] group-hover/thumb:opacity-100"
              onClick={(event) => event.stopPropagation()}
              type="button"
              variant="ghost"
            >
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onEditName();
              }}
            >
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onCondition();
              }}
            >
              <GitBranchIcon />
              Condition
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                void onReorderFields();
              }}
            >
              <SortDescIcon />
              Reorder fields
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              variant="destructive"
            >
              <Trash2Icon />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover/thumb:opacity-100">
          <Button
            aria-label={`Move ${name} up`}
            className="size-6 rounded border border-gray-300 bg-white p-0 text-[var(--auth-primary)] shadow-sm hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)] disabled:opacity-40"
            disabled={!canMoveUp}
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
            type="button"
            variant="ghost"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
          <Button
            aria-label={`Move ${name} down`}
            className="size-6 rounded border border-gray-300 bg-white p-0 text-[var(--auth-primary)] shadow-sm hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)] disabled:opacity-40"
            disabled={!canMoveDown}
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
            type="button"
            variant="ghost"
          >
            <ArrowDownIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocumentConditionsModal({
  document,
  fields,
  name,
  onOpenChange,
  onSave,
  template,
}: {
  document: TemplateDocument;
  fields: TemplateEditorField[];
  name: string;
  onOpenChange: (open: boolean) => void;
  onSave: (conditions: unknown) => Promise<void>;
  template: TemplateResponse;
}) {
  const schemaItem = template.schema.find(
    (item) => item.attachment_uuid === document.uuid,
  );
  const field = createDocumentConditionItem(document, name, schemaItem);

  return (
    <FieldConditionsModal
      field={field}
      fields={fields}
      onOpenChange={onOpenChange}
      onSave={(patch) => onSave(patch.conditions)}
      title={name}
    />
  );
}

function createDocumentConditionItem(
  document: TemplateDocument,
  name: string,
  schemaItem?: TemplateResponse["schema"][number],
): TemplateEditorField {
  return {
    areas: [],
    conditions: Array.isArray(schemaItem?.conditions)
      ? schemaItem.conditions
      : undefined,
    name,
    required: false,
    type: "text",
    uuid: `document:${document.uuid}`,
  };
}

export function DocumentNameEditor({
  document,
  isEditing,
  name,
  onEditingChange,
  onRename,
}: {
  document: TemplateDocument;
  isEditing: boolean;
  name: string;
  onEditingChange: (isEditing: boolean) => void;
  onRename: (document: TemplateDocument, name: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState(name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  async function saveName() {
    const nextName = draftName.trim();

    if (!nextName || nextName === name) {
      setDraftName(name);
      onEditingChange(false);
      return;
    }

    setIsSaving(true);

    try {
      await onRename(document, nextName);
      toast.success("Document name updated");
      onEditingChange(false);
    } catch (renameError) {
      const message =
        renameError instanceof Error
          ? renameError.message
          : "Document name could not be updated.";

      setDraftName(name);
      toast.error("Document rename failed", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <input
        aria-label="Document name"
        className="mx-1 h-8 rounded-md border border-[var(--auth-accent)] bg-background px-2 text-base outline-none ring-2 ring-[var(--auth-accent)]/20"
        disabled={isSaving}
        onBlur={() => void saveName()}
        onChange={(event) => setDraftName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void saveName();
          }

          if (event.key === "Escape") {
            setDraftName(name);
            onEditingChange(false);
          }
        }}
        ref={inputRef}
        value={draftName}
      />
    );
  }

  return (
    <button
      className="group/title flex min-h-8 items-center gap-2 rounded-md px-2 text-left text-base hover:bg-[var(--auth-muted)]"
      onClick={() => onEditingChange(true)}
      type="button"
    >
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <PencilIcon className="size-4 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100" />
    </button>
  );
}

export function AddDocumentMenu({
  isUploadingDocument,
  onAddDocument,
}: {
  isUploadingDocument: boolean;
  onAddDocument: (file: File) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <DropdownMenu>
      <input
        accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={isUploadingDocument}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void onAddDocument(file);
          }

          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      <DropdownMenuTrigger asChild>
        <Button
          className="h-12 w-full rounded-full border-[var(--auth-primary)] bg-transparent px-5 font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
          disabled={isUploadingDocument}
          type="button"
          variant="outline"
        >
          {isUploadingDocument ? (
            <Spinner />
          ) : (
            <FilePlus2Icon data-icon="inline-start" />
          )}
          ADD DOCUMENT
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" side="top">
        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
          <UploadIcon />
          Upload from computer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            toast.info("Google Drive import is not wired yet", {
              description: "The menu is in place for the upcoming integration.",
            })
          }
        >
          <CloudIcon />
          Google Drive
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            toast.info("Import from URL is not wired yet", {
              description: "This will use the remote document import flow.",
            })
          }
        >
          <LinkIcon />
          Import from URL
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
