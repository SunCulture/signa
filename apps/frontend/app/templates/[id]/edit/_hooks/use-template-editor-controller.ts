"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/http";
import {
  addTemplateGoogleDriveDocuments,
  getAccountCustomFields,
  getTemplate,
  saveAccountCustomFields,
  type TemplateResponse,
  updateTemplate,
} from "@/lib/api/templates";
import { pickGoogleDriveDocuments } from "@/lib/google-drive/picker";
import {
  buildTemplateCustomField,
  normalizeTemplateFields,
  normalizeTemplateCustomFields,
  normalizeTemplateSubmitters,
  type EditorFieldType,
  type TemplateCustomField,
  type TemplateEditorField,
  type TemplateSubmitter,
} from "../_lib/template-editor-model";
import { createTemplateEditorDocumentActions } from "./template-editor-document-actions";
import { createTemplateEditorFieldActions } from "./template-editor-field-actions";
import { createTemplateEditorSigningActions } from "./template-editor-signing-actions";
import { createTemplateEditorSubmitterActions } from "./template-editor-submitter-actions";
import { createTemplateEditorTemplateActions } from "./template-editor-template-actions";

type TemplateEditorHistoryEntry = {
  fields: unknown[];
  schema: TemplateResponse["schema"];
  selectedFieldUuid: string | null;
  submitters: TemplateResponse["submitters"];
};

const MAX_TEMPLATE_EDITOR_HISTORY = 50;
const TEMPLATE_EDITOR_HISTORY_STORAGE_PREFIX = "signa_template_editor_history";

export function useTemplateEditorController() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [customFields, setCustomFields] = useState<TemplateCustomField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentUuid, setSelectedDocumentUuid] = useState<
    string | null
  >(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [editingDocumentUuid, setEditingDocumentUuid] = useState<string | null>(
    null,
  );
  const [activeFieldType, setActiveFieldType] =
    useState<EditorFieldType | null>(null);
  const [selectedFieldUuid, setSelectedFieldUuid] = useState<string | null>(
    null,
  );
  const [selectedSubmitterUuid, setSelectedSubmitterUuid] = useState<
    string | null
  >(null);
  const [selectedFieldUuids, setSelectedFieldUuids] = useState<string[]>([]);
  const [isSavingFields, setIsSavingFields] = useState(false);
  const [isOpeningSelfSign, setIsOpeningSelfSign] = useState(false);
  const [isDownloadingTemplateDocuments, setIsDownloadingTemplateDocuments] =
    useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isUpdatingSharedLink, setIsUpdatingSharedLink] = useState(false);
  const undoHistoryRef = useRef<TemplateEditorHistoryEntry[]>([]);
  const redoHistoryRef = useRef<TemplateEditorHistoryEntry[]>([]);
  const [historyRevision, setHistoryRevision] = useState(0);

  useEffect(() => {
    Promise.all([
      getTemplate(params.id),
      getAccountCustomFields().catch(() => ({ value: [] })),
    ])
      .then(([loadedTemplate, customFieldsResponse]) => {
        setTemplate(loadedTemplate);
        setCustomFields(
          normalizeTemplateCustomFields(customFieldsResponse.value),
        );
        const history = loadTemplateEditorHistory(loadedTemplate.id);
        undoHistoryRef.current = history.undo;
        redoHistoryRef.current = history.redo;
        setHistoryRevision((revision) => revision + 1);
        setSelectedDocumentUuid(
          (currentUuid) =>
            currentUuid ?? loadedTemplate.documents.at(0)?.uuid ?? null,
        );
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof ApiError && loadError.status === 401) {
          router.push("/auth/login");
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : "Template could not be loaded.";

        setError(message);
        toast.error("Template could not be loaded", {
          description: message,
          classNames: { icon: "text-destructive" },
        });
      });
  }, [params.id, router]);

  useEffect(() => {
    if (!template) {
      return;
    }

    const submitters = normalizeTemplateSubmitters(template.submitters);

    queueMicrotask(() => {
      if (!submitters.length) {
        setSelectedSubmitterUuid(null);
        return;
      }

      setSelectedSubmitterUuid((currentUuid) =>
        currentUuid &&
        submitters.some((submitter) => submitter.uuid === currentUuid)
          ? currentUuid
          : (submitters[0]?.uuid ?? null),
      );
    });
  }, [template]);

  function goBackToTemplates() {
    router.push("/templates");
  }

  if (error || !template) {
    return {
      error,
      goBackToTemplates,
      isLoaded: false as const,
      template,
    };
  }

  const currentTemplate = template;
  const selectedDocument =
    currentTemplate.documents.find(
      (document) => document.uuid === selectedDocumentUuid,
    ) ?? currentTemplate.documents.at(0);
  const currentFields = normalizeTemplateFields(currentTemplate.fields);
  const currentSubmitters = normalizeTemplateSubmitters(
    currentTemplate.submitters,
  );
  const selectedSubmitter =
    currentSubmitters.find(
      (submitter) => submitter.uuid === selectedSubmitterUuid,
    ) ??
    currentSubmitters.at(0) ??
    null;
  const selectedField =
    currentFields.find((field) => field.uuid === selectedFieldUuid) ?? null;
  const pendingFieldAttachmentUuids = currentTemplate.schema
    .filter((item) => item.pending_fields && item.attachment_uuid)
    .map((item) => item.attachment_uuid)
    .filter((uuid): uuid is string => typeof uuid === "string");

  function selectField(fieldUuid: string | null, additive = false) {
    if (!fieldUuid) {
      setSelectedFieldUuid(null);
      setSelectedFieldUuids([]);
      return;
    }

    setSelectedFieldUuid(fieldUuid);
    setSelectedFieldUuids((current) => {
      if (!additive) {
        return [fieldUuid];
      }

      return current.includes(fieldUuid)
        ? current.filter((uuid) => uuid !== fieldUuid)
        : [...current, fieldUuid];
    });
  }

  function getEffectiveSelectedFieldUuids(fieldUuid?: string): string[] {
    if (selectedFieldUuids.length) {
      return selectedFieldUuids;
    }

    return fieldUuid
      ? [fieldUuid]
      : selectedFieldUuid
        ? [selectedFieldUuid]
        : [];
  }

  function createHistoryEntry(
    templateSnapshot = currentTemplate,
  ): TemplateEditorHistoryEntry {
    return {
      fields: cloneTemplateEditorHistoryValue(templateSnapshot.fields),
      schema: cloneTemplateEditorHistoryValue(templateSnapshot.schema),
      selectedFieldUuid,
      submitters: cloneTemplateEditorHistoryValue(templateSnapshot.submitters),
    };
  }

  function recordEditorHistory(entry = createHistoryEntry()) {
    undoHistoryRef.current = [
      ...undoHistoryRef.current.slice(-(MAX_TEMPLATE_EDITOR_HISTORY - 1)),
      entry,
    ];
    redoHistoryRef.current = [];
    persistTemplateEditorHistory(currentTemplate.id, {
      redo: redoHistoryRef.current,
      undo: undoHistoryRef.current,
    });
    setHistoryRevision((revision) => revision + 1);
  }

  async function applyEditorHistory(
    entry: TemplateEditorHistoryEntry,
    direction: "redo" | "undo",
  ) {
    const currentEntry = createHistoryEntry();

    if (direction === "undo") {
      redoHistoryRef.current = [...redoHistoryRef.current, currentEntry];
    } else {
      undoHistoryRef.current = [...undoHistoryRef.current, currentEntry];
    }

    persistTemplateEditorHistory(currentTemplate.id, {
      redo: redoHistoryRef.current,
      undo: undoHistoryRef.current,
    });

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? {
            ...previousTemplate,
            fields: entry.fields,
            schema: entry.schema,
            submitters: entry.submitters,
          }
        : previousTemplate,
    );
    setSelectedFieldUuid(entry.selectedFieldUuid);
    setSelectedFieldUuids(
      entry.selectedFieldUuid ? [entry.selectedFieldUuid] : [],
    );
    setIsSavingFields(true);
    setHistoryRevision((revision) => revision + 1);

    try {
      await updateTemplate(currentTemplate.id, {
        fields: entry.fields,
        schema: entry.schema,
        submitters: entry.submitters,
      });
      toast.success(direction === "undo" ? "Change undone" : "Change redone");
    } catch (historyError) {
      const message =
        historyError instanceof Error
          ? historyError.message
          : "Template history could not be restored.";

      toast.error(direction === "undo" ? "Undo failed" : "Redo failed", {
        description: message,
      });
      setTemplate((previousTemplate) =>
        previousTemplate?.id === currentTemplate.id
          ? {
              ...previousTemplate,
              fields: currentEntry.fields,
              schema: currentEntry.schema,
              submitters: currentEntry.submitters,
            }
          : previousTemplate,
      );
      setSelectedFieldUuid(currentEntry.selectedFieldUuid);
      setSelectedFieldUuids(
        currentEntry.selectedFieldUuid ? [currentEntry.selectedFieldUuid] : [],
      );
    } finally {
      setIsSavingFields(false);
    }
  }

  async function undoTemplateChange() {
    const entry = undoHistoryRef.current.at(-1);

    if (!entry) {
      return;
    }

    undoHistoryRef.current = undoHistoryRef.current.slice(0, -1);
    persistTemplateEditorHistory(currentTemplate.id, {
      redo: redoHistoryRef.current,
      undo: undoHistoryRef.current,
    });
    await applyEditorHistory(entry, "undo");
  }

  async function redoTemplateChange() {
    const entry = redoHistoryRef.current.at(-1);

    if (!entry) {
      return;
    }

    redoHistoryRef.current = redoHistoryRef.current.slice(0, -1);
    persistTemplateEditorHistory(currentTemplate.id, {
      redo: redoHistoryRef.current,
      undo: undoHistoryRef.current,
    });
    await applyEditorHistory(entry, "redo");
  }

  async function persistFields(
    nextFields: TemplateEditorField[],
    options: { successMessage?: string } = {},
  ) {
    const serializedFields = nextFields as unknown[];
    const previousFields = currentTemplate.fields;

    recordEditorHistory();

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? { ...previousTemplate, fields: serializedFields }
        : previousTemplate,
    );
    setIsSavingFields(true);

    try {
      await updateTemplate(currentTemplate.id, { fields: serializedFields });

      if (options.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Template fields could not be saved.";

      toast.error("Field update failed", { description: message });
      setTemplate((previousTemplate) =>
        previousTemplate?.id === currentTemplate.id
          ? { ...previousTemplate, fields: previousFields }
          : previousTemplate,
      );
    } finally {
      setIsSavingFields(false);
    }
  }

  async function persistTemplateStructure({
    fields = currentFields,
    submitters = currentSubmitters,
    successMessage,
  }: {
    fields?: TemplateEditorField[];
    submitters?: TemplateSubmitter[];
    successMessage?: string;
  }) {
    const previousFields = currentTemplate.fields;
    const previousSubmitters = currentTemplate.submitters;
    const serializedFields = fields as unknown[];
    const serializedSubmitters = submitters;

    recordEditorHistory();

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? {
            ...previousTemplate,
            fields: serializedFields,
            submitters: serializedSubmitters,
          }
        : previousTemplate,
    );
    setIsSavingFields(true);

    try {
      await updateTemplate(currentTemplate.id, {
        fields: serializedFields,
        submitters: serializedSubmitters,
      });

      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Template roles could not be saved.";

      toast.error("Template update failed", { description: message });
      setTemplate((previousTemplate) =>
        previousTemplate?.id === currentTemplate.id
          ? {
              ...previousTemplate,
              fields: previousFields,
              submitters: previousSubmitters,
            }
          : previousTemplate,
      );
    } finally {
      setIsSavingFields(false);
    }
  }

  const templateActions = createTemplateEditorTemplateActions({
    currentFields,
    currentTemplate,
    pendingFieldAttachmentUuids,
    setIsDownloadingTemplateDocuments,
    setIsPreferencesOpen,
    setIsSavingFields,
    setIsSavingPreferences,
    setIsUpdatingSharedLink,
    setSelectedFieldUuid,
    setTemplate,
  });
  const fieldActions = createTemplateEditorFieldActions({
    activeFieldType,
    currentFields,
    customFields,
    currentTemplate,
    getEffectiveSelectedFieldUuids,
    persistFields,
    persistTemplateStructure,
    selectField,
    selectedDocument,
    selectedField,
    selectedSubmitter,
    setActiveFieldType,
    setSelectedDocumentUuid,
    setSelectedFieldUuid,
    setSelectedFieldUuids,
  });
  const submitterActions = createTemplateEditorSubmitterActions({
    currentFields,
    currentSubmitters,
    persistTemplateStructure,
    selectedField,
    selectedSubmitterUuid,
    setSelectedFieldUuid,
    setSelectedSubmitterUuid,
  });
  const documentActions = createTemplateEditorDocumentActions({
    currentTemplate,
    setIsUploadingDocument,
    setSelectedDocumentUuid,
    setTemplate,
  });
  const signingActions = createTemplateEditorSigningActions({
    currentSubmitters,
    currentTemplate,
    router,
    setIsOpeningSelfSign,
  });

  async function saveFieldAsCustomField(field: TemplateEditorField) {
    const customField = buildTemplateCustomField(field);
    const nextCustomFields = [
      customField,
      ...customFields.filter((item) => item.uuid !== customField.uuid),
    ];

    try {
      const savedFields = await saveAccountCustomFields(
        nextCustomFields as Record<string, unknown>[],
      );

      setCustomFields(normalizeTemplateCustomFields(savedFields));
      toast.success("Custom field saved");
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Custom field could not be saved.";

      toast.error("Custom field save failed", { description: message });
    }
  }

  async function addGoogleDriveDocuments() {
    const existingUuids = new Set(
      currentTemplate.documents.map((document) => document.uuid),
    );

    setIsUploadingDocument(true);
    toast.loading("Opening Google Drive", { id: "template-document-upload" });

    try {
      const picked = await pickGoogleDriveDocuments();

      if (!picked.files.length) {
        toast.info("No Google Drive files selected", {
          id: "template-document-upload",
        });
        return;
      }

      toast.loading("Importing Google Drive files", {
        description: `${picked.files.length} selected`,
        id: "template-document-upload",
      });

      await addTemplateGoogleDriveDocuments(currentTemplate.id, {
        access_token: picked.accessToken,
        files: picked.files,
        merge: true,
      });

      const refreshedTemplate = await getTemplate(currentTemplate.id);
      const addedDocument =
        refreshedTemplate.documents.find(
          (document) => !existingUuids.has(document.uuid),
        ) ?? refreshedTemplate.documents.at(-1);

      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(addedDocument?.uuid ?? null);
      toast.success("Google Drive document added", {
        id: "template-document-upload",
      });
    } catch (error) {
      toast.error("Google Drive import failed", {
        description:
          error instanceof Error
            ? error.message
            : "Document could not be imported.",
        id: "template-document-upload",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }

  return {
    activeFieldType,
    addBlankPage: documentActions.addBlankPage,
    addDocument: documentActions.addDocument,
    addGoogleDriveDocuments,
    addCustomFieldWithoutDrawing: fieldActions.addCustomFieldWithoutDrawing,
    addDroppedField: fieldActions.addDroppedField,
    addFieldWithoutDrawing: fieldActions.addFieldWithoutDrawing,
    addSubmitter: submitterActions.addSubmitter,
    copyFieldToAllPages: fieldActions.copyFieldToAllPages,
    copySelectedFields: fieldActions.copySelectedFields,
    currentFields,
    currentSubmitters,
    customFields,
    canRedo: redoHistoryRef.current.length > 0,
    canUndo: undoHistoryRef.current.length > 0,
    createField: fieldActions.createField,
    currentTemplate,
    deleteField: fieldActions.deleteField,
    deleteSelectedFields: fieldActions.deleteSelectedFields,
    downloadTemplateDocuments: templateActions.downloadTemplateDocuments,
    editingDocumentUuid,
    goToFieldArea: fieldActions.goToFieldArea,
    goToFieldPage: fieldActions.goToFieldPage,
    isDownloadingTemplateDocuments,
    isOpeningSelfSign,
    isPreferencesOpen,
    isSavingFields,
    isSavingPreferences,
    isUpdatingSharedLink,
    isUploadingDocument,
    moveDocument: documentActions.moveDocument,
    moveFieldInOrder: fieldActions.moveFieldInOrder,
    moveFieldToIndex: fieldActions.moveFieldToIndex,
    nudgeSelectedFields: fieldActions.nudgeSelectedFields,
    openSelfSigningForm: signingActions.openSelfSigningForm,
    pasteCopiedFields: fieldActions.pasteCopiedFields,
    pendingFieldAttachmentUuids,
    removeDocument: documentActions.removeDocument,
    removeSubmitter: submitterActions.removeSubmitter,
    renameDocument: documentActions.renameDocument,
    renameSubmitter: submitterActions.renameSubmitter,
    renameTemplate: templateActions.renameTemplate,
    replaceDocument: documentActions.replaceDocument,
    reorderDocumentFields: documentActions.reorderDocumentFields,
    resolvePendingImportedFields: templateActions.resolvePendingImportedFields,
    redoTemplateChange,
    saveTemplateDraft: templateActions.saveTemplateDraft,
    saveFieldAsCustomField,
    saveTemplatePreferences: templateActions.saveTemplatePreferences,
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
    startDrawNewArea: fieldActions.startDrawNewArea,
    updateField: fieldActions.updateField,
    updateFieldAndTemplate: fieldActions.updateFieldAndTemplate,
    updateFieldArea: fieldActions.updateFieldArea,
    updateDocumentConditions: documentActions.updateDocumentConditions,
    updateTemplateSharedLink: templateActions.updateTemplateSharedLink,
    updateTemplateTestingShare: templateActions.updateTemplateTestingShare,
    undoTemplateChange,
    error,
    goBackToTemplates,
    historyRevision,
    isLoaded: true as const,
    template,
  };
}

function cloneTemplateEditorHistoryValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getTemplateEditorHistoryStorageKey(templateId: string): string {
  return `${TEMPLATE_EDITOR_HISTORY_STORAGE_PREFIX}:${templateId}`;
}

function loadTemplateEditorHistory(templateId: string): {
  redo: TemplateEditorHistoryEntry[];
  undo: TemplateEditorHistoryEntry[];
} {
  try {
    const rawValue = sessionStorage.getItem(
      getTemplateEditorHistoryStorageKey(templateId),
    );

    if (!rawValue) {
      return { redo: [], undo: [] };
    }

    const parsed = JSON.parse(rawValue) as {
      redo?: TemplateEditorHistoryEntry[];
      undo?: TemplateEditorHistoryEntry[];
    };

    return {
      redo: Array.isArray(parsed.redo) ? parsed.redo : [],
      undo: Array.isArray(parsed.undo) ? parsed.undo : [],
    };
  } catch {
    return { redo: [], undo: [] };
  }
}

function persistTemplateEditorHistory(
  templateId: string,
  history: {
    redo: TemplateEditorHistoryEntry[];
    undo: TemplateEditorHistoryEntry[];
  },
) {
  try {
    sessionStorage.setItem(
      getTemplateEditorHistoryStorageKey(templateId),
      JSON.stringify({
        redo: history.redo.slice(-MAX_TEMPLATE_EDITOR_HISTORY),
        undo: history.undo.slice(-MAX_TEMPLATE_EDITOR_HISTORY),
      }),
    );
  } catch {
    // Best-effort browser history only. Template persistence is still server-side.
  }
}
