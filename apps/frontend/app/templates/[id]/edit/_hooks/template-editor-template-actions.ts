"use client";

import { toast } from "sonner";

import {
  getTemplateDocumentDownloads,
  updateTemplate,
  updateTemplatePreferences,
  type TemplateResponse,
} from "@/lib/api/templates";
import {
  downloadUrlsSequentially,
  type TemplateEditorField,
} from "../_lib/template-editor-model";

type Context = {
  currentFields: TemplateEditorField[];
  currentTemplate: TemplateResponse;
  pendingFieldAttachmentUuids: string[];
  setIsDownloadingTemplateDocuments: (isDownloading: boolean) => void;
  setIsPreferencesOpen: (isOpen: boolean) => void;
  setIsSavingFields: (isSaving: boolean) => void;
  setIsSavingPreferences: (isSaving: boolean) => void;
  setIsUpdatingSharedLink: (isUpdating: boolean) => void;
  setSelectedFieldUuid: (
    fieldUuid: string | null | ((fieldUuid: string | null) => string | null),
  ) => void;
  setTemplate: (
    updater:
      | TemplateResponse
      | ((template: TemplateResponse | null) => TemplateResponse | null),
  ) => void;
};

export function createTemplateEditorTemplateActions(context: Context) {
  const {
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
  } = context;

  async function saveTemplateDraft() {
    setIsSavingFields(true);

    try {
      await updateTemplate(currentTemplate.id, {
        fields: currentTemplate.fields,
        schema: currentTemplate.schema,
        submitters: currentTemplate.submitters,
      });
      toast.success("Template saved");
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Template could not be saved.";

      toast.error("Save failed", { description: message });
    } finally {
      setIsSavingFields(false);
    }
  }

  async function saveTemplatePreferences(preferences: Record<string, unknown>) {
    const previousPreferences = currentTemplate.preferences;
    const nextPreferences = {
      ...previousPreferences,
      ...preferences,
    };

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? { ...previousTemplate, preferences: nextPreferences }
        : previousTemplate,
    );
    setIsSavingPreferences(true);

    try {
      await updateTemplatePreferences(currentTemplate.id, preferences);
      toast.success("Preferences saved");
      setIsPreferencesOpen(false);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Template preferences could not be saved.";

      toast.error("Preferences update failed", { description: message });
      setTemplate((previousTemplate) =>
        previousTemplate?.id === currentTemplate.id
          ? { ...previousTemplate, preferences: previousPreferences }
          : previousTemplate,
      );
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function updateTemplateSharedLink(sharedLink: boolean) {
    const previousSharedLink = currentTemplate.shared_link;

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? { ...previousTemplate, shared_link: sharedLink }
        : previousTemplate,
    );
    setIsUpdatingSharedLink(true);

    try {
      await updateTemplate(currentTemplate.id, { shared_link: sharedLink });
      toast.success(
        sharedLink ? "Shared link enabled" : "Shared link disabled",
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Shared link could not be updated.";

      toast.error("Shared link update failed", { description: message });
      setTemplate((previousTemplate) =>
        previousTemplate?.id === currentTemplate.id
          ? { ...previousTemplate, shared_link: previousSharedLink }
          : previousTemplate,
      );
    } finally {
      setIsUpdatingSharedLink(false);
    }
  }

  async function downloadTemplateDocuments() {
    setIsDownloadingTemplateDocuments(true);

    try {
      const urls = await getTemplateDocumentDownloads(currentTemplate.id);

      await downloadUrlsSequentially(urls);
      toast.success("Download started");
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Template documents could not be downloaded.";

      toast.error("Download failed", { description: message });
    } finally {
      setIsDownloadingTemplateDocuments(false);
    }
  }

  async function resolvePendingImportedFields(action: "keep" | "remove") {
    if (!pendingFieldAttachmentUuids.length) {
      return;
    }

    const pendingUuidSet = new Set(pendingFieldAttachmentUuids);
    const nextSchema = currentTemplate.schema.map((item) => {
      if (!item.attachment_uuid || !pendingUuidSet.has(item.attachment_uuid)) {
        return item;
      }

      const schemaItem = { ...item };
      delete schemaItem.pending_fields;
      return schemaItem;
    });
    const nextFields =
      action === "remove"
        ? currentFields.filter(
            (field) =>
              !field.areas.some((area) =>
                pendingUuidSet.has(area.attachment_uuid),
              ),
          )
        : currentFields;

    setIsSavingFields(true);
    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? {
            ...previousTemplate,
            fields: nextFields as unknown[],
            schema: nextSchema,
          }
        : previousTemplate,
    );

    try {
      await updateTemplate(currentTemplate.id, {
        fields: nextFields as unknown[],
        schema: nextSchema,
      });

      if (action === "remove") {
        setSelectedFieldUuid((fieldUuid) =>
          nextFields.some((field) => field.uuid === fieldUuid)
            ? fieldUuid
            : null,
        );
      }

      toast.success(
        action === "keep" ? "Imported fields kept" : "Imported fields removed",
      );
    } catch (pendingError) {
      const message =
        pendingError instanceof Error
          ? pendingError.message
          : "Imported fields could not be updated.";

      toast.error("Imported fields update failed", { description: message });
      setTemplate(currentTemplate);
    } finally {
      setIsSavingFields(false);
    }
  }

  return {
    downloadTemplateDocuments,
    resolvePendingImportedFields,
    saveTemplateDraft,
    saveTemplatePreferences,
    updateTemplateSharedLink,
  };
}
