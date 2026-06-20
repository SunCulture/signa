"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/http";
import {
  getTemplate,
  type TemplateResponse,
  updateTemplate,
} from "@/lib/api/templates";
import {
  normalizeTemplateFields,
  normalizeTemplateSubmitters,
  type EditorFieldType,
  type TemplateEditorField,
  type TemplateSubmitter,
} from "../_lib/template-editor-model";
import { createTemplateEditorDocumentActions } from "./template-editor-document-actions";
import { createTemplateEditorFieldActions } from "./template-editor-field-actions";
import { createTemplateEditorSigningActions } from "./template-editor-signing-actions";
import { createTemplateEditorSubmitterActions } from "./template-editor-submitter-actions";
import { createTemplateEditorTemplateActions } from "./template-editor-template-actions";

export function useTemplateEditorController() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
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

  useEffect(() => {
    getTemplate(params.id)
      .then((loadedTemplate) => {
        setTemplate(loadedTemplate);
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

  async function persistFields(
    nextFields: TemplateEditorField[],
    options: { successMessage?: string } = {},
  ) {
    const serializedFields = nextFields as unknown[];
    const previousFields = currentTemplate.fields;

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
    const serializedSubmitters = submitters as unknown[];

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

  return {
    activeFieldType,
    addDocument: documentActions.addDocument,
    addDroppedField: fieldActions.addDroppedField,
    addFieldWithoutDrawing: fieldActions.addFieldWithoutDrawing,
    addSubmitter: submitterActions.addSubmitter,
    copyFieldToAllPages: fieldActions.copyFieldToAllPages,
    copySelectedFields: fieldActions.copySelectedFields,
    currentFields,
    currentSubmitters,
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
    replaceDocument: documentActions.replaceDocument,
    resolvePendingImportedFields: templateActions.resolvePendingImportedFields,
    saveTemplateDraft: templateActions.saveTemplateDraft,
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
    updateTemplateSharedLink: templateActions.updateTemplateSharedLink,
    error,
    goBackToTemplates,
    isLoaded: true as const,
    template,
  };
}
