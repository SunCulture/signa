"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  DownloadIcon,
  EyeIcon,
  PenLineIcon,
  SaveIcon,
  SlidersHorizontalIcon,
  UserRoundPlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { PendingImportedFieldsBanner } from "./_components/pending-imported-fields-banner";
import { TemplateCanvas } from "./_components/canvas/template-canvas";
import { TemplateDocumentsPanel } from "./_components/documents/template-documents-panel";
import { TemplateFieldsPanel } from "./_components/fields/template-fields-panel";
import { TemplateSendRecipientsDialog } from "./_components/send/template-send-recipients-dialog";
import { useTemplateEditorController } from "./_hooks/use-template-editor-controller";
import { TemplatePreferencesDialog } from "./template-preferences-dialog";

export function TemplateEditor() {
  const editor = useTemplateEditorController();
  const [isRecipientsOpen, setIsRecipientsOpen] = useState(false);

  if (!editor.isLoaded) {
    return (
      <TemplateEditorStatus
        error={editor.error}
        onBack={editor.goBackToTemplates}
      />
    );
  }

  const {
    activeFieldType,
    addDocument,
    addDroppedField,
    addFieldWithoutDrawing,
    addSubmitter,
    copyFieldToAllPages,
    copySelectedFields,
    currentFields,
    currentSubmitters,
    createField,
    currentTemplate,
    deleteField,
    deleteSelectedFields,
    downloadTemplateDocuments,
    editingDocumentUuid,
    goToFieldArea,
    goToFieldPage,
    isDownloadingTemplateDocuments,
    isOpeningSelfSign,
    isPreferencesOpen,
    isSavingFields,
    isSavingPreferences,
    isUpdatingSharedLink,
    isUploadingDocument,
    moveDocument,
    moveFieldInOrder,
    moveFieldToIndex,
    nudgeSelectedFields,
    openSelfSigningForm,
    pasteCopiedFields,
    pendingFieldAttachmentUuids,
    removeDocument,
    removeSubmitter,
    renameDocument,
    renameSubmitter,
    replaceDocument,
    reorderDocumentFields,
    resolvePendingImportedFields,
    saveTemplateDraft,
    saveTemplatePreferences,
    selectField,
    selectedDocument,
    selectedFieldUuid,
    selectedFieldUuids,
    selectedSubmitter,
    setActiveFieldType,
    setEditingDocumentUuid,
    setIsPreferencesOpen,
    setSelectedDocumentUuid,
    setSelectedSubmitterUuid,
    startDrawNewArea,
    updateField,
    updateFieldAndTemplate,
    updateFieldArea,
    updateDocumentConditions,
    updateTemplateSharedLink,
  } = editor;

  function openRecipientsDialog() {
    if (currentSubmitters.length <= 1) {
      toast.error("Add another party before sending", {
        description:
          "Party one is reserved for self-signing. Add a second party to send this template to recipients.",
      });
      return;
    }

    setIsRecipientsOpen(true);
  }

  return (
    <main className="flex h-svh flex-col overflow-hidden bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      {pendingFieldAttachmentUuids.length > 0 ? (
        <PendingImportedFieldsBanner
          isSaving={isSavingFields}
          onKeep={() => void resolvePendingImportedFields("keep")}
          onRemove={() => void resolvePendingImportedFields("remove")}
        />
      ) : null}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--auth-input-border)] bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to templates"
            className="group relative flex size-12 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--auth-muted)]"
            href="/templates"
          >
            <Image
              alt="Signa"
              className="object-contain transition-opacity duration-150 group-hover:opacity-0"
              fill
              priority
              sizes="48px"
              src="/images/logo.png"
            />
            <ArrowLeftIcon className="absolute size-6 text-[var(--auth-primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
          </Link>
          <h1 className="truncate text-3xl font-bold tracking-normal">
            {currentTemplate.name}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            className="h-12 rounded-full px-5 font-bold text-[var(--auth-primary)]"
            disabled={isOpeningSelfSign}
            onClick={() => void openSelfSigningForm()}
            type="button"
            variant="ghost"
          >
            {isOpeningSelfSign ? (
              <Spinner className="size-4" />
            ) : (
              <PenLineIcon data-icon="inline-start" />
            )}
            {isOpeningSelfSign ? "OPENING" : "SIGN YOURSELF"}
          </Button>
          <Button
            className="h-12 rounded-full border-[var(--auth-primary)] px-6 font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
            onClick={openRecipientsDialog}
            type="button"
            variant="outline"
          >
            <UserRoundPlusIcon data-icon="inline-start" />
            SEND
          </Button>
          <div className="flex overflow-hidden rounded-full bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)]">
            <Button
              className="h-12 rounded-none bg-transparent pl-5 pr-6 font-bold text-inherit hover:bg-[var(--auth-primary-hover)]"
              disabled={isSavingFields}
              onClick={() => void saveTemplateDraft()}
              type="button"
            >
              {isSavingFields ? (
                <Spinner className="size-4" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              SAVE
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Save options"
                  className="h-12 rounded-none border-l border-white/20 bg-transparent text-inherit hover:bg-[var(--auth-primary-hover)]"
                  size="icon"
                  type="button"
                >
                  <ChevronDownIcon data-icon="icon-only" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      className="flex items-center gap-2"
                      href={`/templates/${currentTemplate.id}/form`}
                    >
                      <EyeIcon className="size-4" />
                      <span>Save and Preview</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsPreferencesOpen(true)}>
                    <SlidersHorizontalIcon className="size-4" />
                    <span>Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={isDownloadingTemplateDocuments}
                    onClick={() => void downloadTemplateDocuments()}
                  >
                    {isDownloadingTemplateDocuments ? (
                      <Spinner className="size-4" />
                    ) : (
                      <DownloadIcon className="size-4" />
                    )}
                    <span>
                      {isDownloadingTemplateDocuments
                        ? "Downloading..."
                        : "Download"}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {isPreferencesOpen ? (
        <TemplatePreferencesDialog
          isSaving={isSavingPreferences}
          isUpdatingSharedLink={isUpdatingSharedLink}
          open={isPreferencesOpen}
          template={currentTemplate}
          onOpenChange={setIsPreferencesOpen}
          onSave={saveTemplatePreferences}
          onSharedLinkChange={updateTemplateSharedLink}
        />
      ) : null}
      {isRecipientsOpen ? (
        <TemplateSendRecipientsDialog
          onOpenChange={setIsRecipientsOpen}
          open={isRecipientsOpen}
          template={currentTemplate}
        />
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[226px_minmax(0,1fr)_340px]">
        <TemplateDocumentsPanel
          isUploadingDocument={isUploadingDocument}
          onAddDocument={addDocument}
          onEditDocument={setEditingDocumentUuid}
          onMoveDocument={moveDocument}
          onRenameDocument={renameDocument}
          onRemoveDocument={removeDocument}
          onReplaceDocument={replaceDocument}
          onReorderDocumentFields={reorderDocumentFields}
          onSelectDocument={setSelectedDocumentUuid}
          onUpdateDocumentConditions={updateDocumentConditions}
          editingDocumentUuid={editingDocumentUuid}
          selectedDocumentUuid={selectedDocument?.uuid ?? null}
          template={currentTemplate}
        />
        <TemplateCanvas
          activeFieldType={activeFieldType}
          documents={currentTemplate.documents}
          fields={currentFields}
          isSavingFields={isSavingFields}
          onCopySelectedFields={copySelectedFields}
          onDropField={addDroppedField}
          onCreateField={createField}
          onDeleteField={deleteField}
          onDeleteSelectedFields={deleteSelectedFields}
          onNudgeSelectedFields={nudgeSelectedFields}
          onPasteCopiedFields={pasteCopiedFields}
          onSelectField={selectField}
          onUpdateField={updateField}
          onUpdateFieldArea={updateFieldArea}
          selectedFieldUuid={selectedFieldUuid}
          selectedFieldUuids={selectedFieldUuids}
          selectedDocumentUuid={selectedDocument?.uuid ?? null}
          submitters={currentSubmitters}
          template={currentTemplate}
        />
        <TemplateFieldsPanel
          activeFieldType={activeFieldType}
          fields={currentFields}
          isSavingFields={isSavingFields}
          onAddSubmitter={addSubmitter}
          onAddFieldWithoutDrawing={addFieldWithoutDrawing}
          onCancelFieldPlacement={() => setActiveFieldType(null)}
          onCopyFieldToAllPages={copyFieldToAllPages}
          onDeleteField={deleteField}
          onFieldTypeSelect={setActiveFieldType}
          onGoToFieldArea={goToFieldArea}
          onGoToFieldPage={goToFieldPage}
          onMoveField={moveFieldInOrder}
          onMoveFieldToIndex={moveFieldToIndex}
          onRemoveSubmitter={removeSubmitter}
          onRenameSubmitter={renameSubmitter}
          onSelectSubmitter={setSelectedSubmitterUuid}
          onSelectField={(fieldUuid) => selectField(fieldUuid)}
          onStartDrawNewArea={startDrawNewArea}
          onUpdateField={updateFieldAndTemplate}
          selectedFieldUuid={selectedFieldUuid}
          selectedSubmitterUuid={selectedSubmitter?.uuid ?? null}
          submitters={currentSubmitters}
        />
      </div>
    </main>
  );
}

function TemplateEditorStatus({
  error,
  onBack,
}: {
  error: string | null;
  onBack: () => void;
}) {
  if (error) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] px-6 text-[var(--auth-foreground)]">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <Button
            className="rounded-full border-[var(--auth-primary)] px-6 text-[var(--auth-primary)]"
            onClick={onBack}
            type="button"
            variant="outline"
          >
            Back to templates
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--auth-background)] text-[var(--auth-foreground)]">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <Spinner />
        Loading template editor
      </div>
    </main>
  );
}
