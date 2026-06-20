"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { getAuthSession } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import { createSubmission } from "@/lib/api/submissions";
import {
  addTemplateDocument,
  getTemplate,
  getTemplateDocumentDownloads,
  type TemplateDocument,
  type TemplateResponse,
  updateTemplate,
  updateTemplatePreferences,
} from "@/lib/api/templates";
import {
  FIELD_CLIPBOARD_STORAGE_KEY,
  buildDefaultFieldName,
  centerDefaultArea,
  createTemplateField,
  downloadUrlsSequentially,
  getDefaultAreaSize,
  getFieldStringValue,
  getFiniteNumber,
  getPartyName,
  insertFieldSorted,
  isRecord,
  normalizeArea,
  normalizeFieldType,
  normalizeTemplateFields,
  normalizeTemplateSubmitters,
  removeFieldsForAttachment,
  rewriteFieldAttachmentUuid,
  safeParseJson,
  type EditorFieldType,
  type FieldDragPayload,
  type SubmitterRemovalMode,
  type TemplateEditorField,
  type TemplateFieldArea,
  type TemplateSubmitter,
} from "../_lib/template-editor-model";

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

  async function createField(area: TemplateFieldArea) {
    if (!activeFieldType) {
      return;
    }

    await createFieldForType(activeFieldType, area);
    setActiveFieldType(null);
  }

  async function createFieldForType(
    type: EditorFieldType,
    area: TemplateFieldArea,
  ) {
    if (!selectedSubmitter) {
      toast.error("Field could not be added", {
        description: "This template does not have a signer role yet.",
      });
      return;
    }

    const field = createTemplateField({
      area,
      fields: currentFields,
      submitter: selectedSubmitter,
      type,
    });
    const nextFields = insertFieldSorted(currentFields, field);

    setSelectedFieldUuid(field.uuid);
    await persistFields(nextFields);
  }

  async function addFieldWithoutDrawing() {
    if (!activeFieldType || !selectedDocument) {
      return;
    }

    await createField(
      centerDefaultArea({
        attachmentUuid: selectedDocument.uuid,
        pageIndex: 0,
        pointer: { x: 0.5, y: 0.18 },
        type: activeFieldType,
      }),
    );
  }

  async function updateFieldArea(
    fieldUuid: string,
    areaIndex: number,
    area: TemplateFieldArea,
  ) {
    const nextFields = currentFields.map((field) =>
      field.uuid === fieldUuid
        ? {
            ...field,
            areas: field.areas.map((item, index) =>
              index === areaIndex ? area : item,
            ),
          }
        : field,
    );

    await persistFields(nextFields);
  }

  async function updateField(
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) {
    const nextFields = currentFields.map((field) =>
      field.uuid === fieldUuid ? { ...field, ...patch } : field,
    );

    await persistFields(nextFields);
  }

  async function updateFieldAndTemplate(
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) {
    const nextFields = currentFields.map((field) =>
      field.uuid === fieldUuid ? { ...field, ...patch } : field,
    );

    await persistTemplateStructure({ fields: nextFields });
  }

  async function copyFieldToAllPages(field: TemplateEditorField) {
    const sourceArea = field.areas.at(0);

    if (!sourceArea) {
      toast.error("Field has no area to copy");
      return;
    }

    const sourceDocument = currentTemplate.documents.find(
      (document) => document.uuid === sourceArea.attachment_uuid,
    );
    const pageCount = sourceDocument?.preview_images.length ?? 0;

    if (pageCount <= 1) {
      toast.info("This document only has one page");
      return;
    }

    const existingAreaKeys = new Set(
      field.areas.map((area) => `${area.attachment_uuid}:${area.page}`),
    );
    const copiedAreas = Array.from({ length: pageCount }, (_, pageIndex) => {
      const areaKey = `${sourceArea.attachment_uuid}:${pageIndex}`;

      if (existingAreaKeys.has(areaKey)) {
        return null;
      }

      return {
        ...sourceArea,
        page: pageIndex,
      };
    }).filter((area): area is TemplateFieldArea => Boolean(area));

    if (!copiedAreas.length) {
      toast.info("Field already exists on every page");
      return;
    }

    await updateFieldAndTemplate(field.uuid, {
      areas: [...field.areas, ...copiedAreas],
    });
    toast.success("Field copied to all pages");
  }

  async function moveFieldInOrder(fieldUuid: string, direction: -1 | 1) {
    const currentIndex = currentFields.findIndex(
      (field) => field.uuid === fieldUuid,
    );
    const currentField = currentFields[currentIndex];

    if (!currentField) {
      return;
    }

    const sameSubmitterFieldIndexes = currentFields.flatMap((field, index) =>
      field.submitter_uuid === currentField.submitter_uuid ? [index] : [],
    );
    const currentSubmitterIndex =
      sameSubmitterFieldIndexes.indexOf(currentIndex);
    const nextIndex =
      sameSubmitterFieldIndexes[currentSubmitterIndex + direction];

    if (
      currentIndex < 0 ||
      currentSubmitterIndex < 0 ||
      nextIndex === undefined ||
      nextIndex < 0 ||
      nextIndex >= currentFields.length
    ) {
      return;
    }

    const nextFields = [...currentFields];
    const [field] = nextFields.splice(currentIndex, 1);

    if (!field) {
      return;
    }

    nextFields.splice(nextIndex, 0, field);
    await persistTemplateStructure({
      fields: nextFields,
      successMessage: "Field order updated",
    });
  }

  async function moveFieldToIndex(fieldUuid: string, targetIndex: number) {
    const currentIndex = currentFields.findIndex(
      (field) => field.uuid === fieldUuid,
    );

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= currentFields.length ||
      currentIndex === targetIndex
    ) {
      return;
    }

    const nextFields = [...currentFields];
    const [field] = nextFields.splice(currentIndex, 1);

    if (!field) {
      return;
    }

    nextFields.splice(targetIndex, 0, field);
    await persistTemplateStructure({
      fields: nextFields,
      successMessage: "Field order updated",
    });
  }

  function goToFieldPage(field: TemplateEditorField) {
    const area = field.areas.at(0);

    if (!area) {
      toast.error("Field has no page area yet");
      return;
    }

    setSelectedDocumentUuid(area.attachment_uuid);
    setSelectedFieldUuid(field.uuid);
    toast.info("Opened field page");
  }

  function goToFieldArea(field: TemplateEditorField, area: TemplateFieldArea) {
    setSelectedDocumentUuid(area.attachment_uuid);
    setSelectedFieldUuid(field.uuid);
    setSelectedFieldUuids([field.uuid]);
    toast.info(`Opened page ${area.page + 1}`);
  }

  function startDrawNewArea(field: TemplateEditorField) {
    setSelectedFieldUuid(field.uuid);
    toast.info("Drag this field row onto a page to draw another area");
  }

  async function addSubmitter() {
    const submitter = {
      name: getPartyName(currentSubmitters.length),
      uuid: crypto.randomUUID(),
    };

    setSelectedSubmitterUuid(submitter.uuid);
    await persistTemplateStructure({
      submitters: [...currentSubmitters, submitter],
      successMessage: "Role added",
    });
  }

  async function renameSubmitter(submitterUuid: string, name: string) {
    const nextName = name.trim() || "Signer";
    const nextSubmitters = currentSubmitters.map((submitter) =>
      submitter.uuid === submitterUuid
        ? { ...submitter, name: nextName }
        : submitter,
    );

    await persistTemplateStructure({ submitters: nextSubmitters });
  }

  async function removeSubmitter(
    submitterUuid: string,
    mode: SubmitterRemovalMode = "keep_fields",
  ) {
    if (currentSubmitters.length <= 1) {
      toast.error("At least one role is required");
      return;
    }

    const nextSubmitters = currentSubmitters.filter(
      (submitter) => submitter.uuid !== submitterUuid,
    );
    const fallbackSubmitter = nextSubmitters[0];

    if (!fallbackSubmitter) {
      return;
    }

    const nextFields =
      mode === "remove_fields"
        ? currentFields.filter(
            (field) => field.submitter_uuid !== submitterUuid,
          )
        : currentFields.map((field) =>
            field.submitter_uuid === submitterUuid
              ? { ...field, submitter_uuid: fallbackSubmitter.uuid }
              : field,
          );

    if (
      selectedField?.submitter_uuid === submitterUuid &&
      mode === "remove_fields"
    ) {
      setSelectedFieldUuid(null);
    }

    if (selectedSubmitterUuid === submitterUuid) {
      setSelectedSubmitterUuid(fallbackSubmitter.uuid);
    }

    await persistTemplateStructure({
      fields: nextFields,
      submitters: nextSubmitters,
      successMessage:
        mode === "remove_fields"
          ? "Role and assigned fields removed"
          : "Role removed and fields reassigned",
    });
  }

  async function addDroppedField(
    payload: FieldDragPayload,
    area: TemplateFieldArea,
  ) {
    if (payload.kind === "new") {
      await createFieldForType(payload.type, normalizeArea(area, payload.type));
      setActiveFieldType(null);
      return;
    }

    const existingField = currentFields.find(
      (field) => field.uuid === payload.fieldUuid,
    );

    if (!existingField) {
      toast.error("Field could not be dropped", {
        description: "The dragged field is no longer available.",
      });
      return;
    }

    const nextArea = normalizeArea(area, existingField.type);
    const nextFields = currentFields.map((field) =>
      field.uuid === existingField.uuid
        ? {
            ...field,
            areas: [...field.areas, nextArea],
          }
        : field,
    );

    setSelectedFieldUuid(existingField.uuid);
    await persistFields(nextFields);
  }

  async function deleteField(fieldUuid: string) {
    const nextFields = currentFields.filter(
      (field) => field.uuid !== fieldUuid,
    );

    selectField(null);
    await persistFields(nextFields, { successMessage: "Field removed" });
  }

  async function deleteSelectedFields(fieldUuid?: string) {
    const selectedUuids = new Set(getEffectiveSelectedFieldUuids(fieldUuid));

    if (!selectedUuids.size) {
      return;
    }

    const nextFields = currentFields.filter(
      (field) => !selectedUuids.has(field.uuid),
    );

    selectField(null);
    await persistFields(nextFields, {
      successMessage:
        selectedUuids.size === 1 ? "Field removed" : "Fields removed",
    });
  }

  async function nudgeSelectedFields(
    fieldUuid: string,
    dx: number,
    dy: number,
  ) {
    const selectedUuids = new Set(getEffectiveSelectedFieldUuids(fieldUuid));

    if (!selectedUuids.size) {
      return;
    }

    const nextFields = currentFields.map((field) =>
      selectedUuids.has(field.uuid)
        ? {
            ...field,
            areas: field.areas.map((area) =>
              normalizeArea(
                {
                  ...area,
                  x: area.x + dx,
                  y: area.y + dy,
                },
                field.type,
              ),
            ),
          }
        : field,
    );

    await persistFields(nextFields);
  }

  function copySelectedFields(fieldUuid?: string) {
    const selectedUuids = new Set(getEffectiveSelectedFieldUuids(fieldUuid));
    const fieldsToCopy = currentFields.filter((field) =>
      selectedUuids.has(field.uuid),
    );

    if (!fieldsToCopy.length) {
      return;
    }

    const minX = Math.min(
      ...fieldsToCopy.flatMap((field) => field.areas.map((area) => area.x)),
    );
    const minY = Math.min(
      ...fieldsToCopy.flatMap((field) => field.areas.map((area) => area.y)),
    );

    localStorage.setItem(
      FIELD_CLIPBOARD_STORAGE_KEY,
      JSON.stringify({
        fields: fieldsToCopy.map((field) => ({
          ...field,
          areas: field.areas.map((area) => ({
            ...area,
            relativeX: area.x - minX,
            relativeY: area.y - minY,
          })),
        })),
        templateId: currentTemplate.id,
        timestamp: Date.now(),
      }),
    );
    toast.success(fieldsToCopy.length === 1 ? "Field copied" : "Fields copied");
  }

  async function pasteCopiedFields() {
    const clipboard = localStorage.getItem(FIELD_CLIPBOARD_STORAGE_KEY);

    if (!clipboard) {
      toast.info("No copied fields");
      return;
    }

    const data = safeParseJson(clipboard);

    if (!isRecord(data) || !Array.isArray(data.fields)) {
      localStorage.removeItem(FIELD_CLIPBOARD_STORAGE_KEY);
      return;
    }

    if (
      typeof data.timestamp === "number" &&
      Date.now() - data.timestamp > 3_600_000
    ) {
      localStorage.removeItem(FIELD_CLIPBOARD_STORAGE_KEY);
      toast.info("Copied fields expired");
      return;
    }

    const anchorArea =
      selectedField?.areas.at(-1) ??
      currentFields.flatMap((field) => field.areas).at(-1) ??
      (selectedDocument
        ? {
            attachment_uuid: selectedDocument.uuid,
            h: 0.04,
            page: 0,
            w: 0.2,
            x: 0.08,
            y: 0.08,
          }
        : null);

    if (!anchorArea) {
      toast.error("No document page available for paste");
      return;
    }

    const pastedFields = data.fields.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }

      const type = normalizeFieldType(item.type);
      const uuid = crypto.randomUUID();
      const optionUuidMap = new Map<string, string>();
      const options: unknown = Array.isArray(item.options)
        ? item.options.flatMap((option) => {
            if (!isRecord(option)) {
              return [];
            }

            const oldUuid = getFieldStringValue(option.uuid);
            const newUuid = crypto.randomUUID();

            if (oldUuid) {
              optionUuidMap.set(oldUuid, newUuid);
            }

            return [{ ...option, uuid: newUuid }];
          })
        : item.options;
      const rawAreas = Array.isArray(item.areas) ? item.areas : [];
      const areas = rawAreas.flatMap((area) => {
        if (!isRecord(area)) {
          return [];
        }

        const optionUuid = getFieldStringValue(area.option_uuid);
        return [
          normalizeArea(
            {
              ...area,
              attachment_uuid: anchorArea.attachment_uuid,
              h: getFiniteNumber(area.h, getDefaultAreaSize(type).h),
              option_uuid: optionUuidMap.get(optionUuid) ?? optionUuid,
              page: anchorArea.page,
              w: getFiniteNumber(area.w, getDefaultAreaSize(type).w),
              x: anchorArea.x + getFiniteNumber(area.relativeX, 0),
              y:
                anchorArea.y +
                anchorArea.h * 1.35 +
                getFiniteNumber(area.relativeY, 0),
            },
            type,
          ),
        ];
      });

      return [
        {
          ...item,
          areas,
          name:
            typeof item.name === "string" && item.name.trim()
              ? item.name
              : buildDefaultFieldName(type, currentFields.length),
          options,
          submitter_uuid:
            typeof item.submitter_uuid === "string"
              ? item.submitter_uuid
              : selectedSubmitter?.uuid,
          type,
          uuid,
        } satisfies TemplateEditorField,
      ];
    });

    if (!pastedFields.length) {
      return;
    }

    await persistFields([...currentFields, ...pastedFields], {
      successMessage:
        pastedFields.length === 1 ? "Field pasted" : "Fields pasted",
    });
    setSelectedFieldUuid(pastedFields.at(-1)?.uuid ?? null);
    setSelectedFieldUuids(pastedFields.map((field) => field.uuid));
  }

  async function renameDocument(document: TemplateDocument, name: string) {
    const nextSchema = currentTemplate.schema.some(
      (item) => item.attachment_uuid === document.uuid,
    )
      ? currentTemplate.schema.map((item) =>
          item.attachment_uuid === document.uuid ? { ...item, name } : item,
        )
      : [...currentTemplate.schema, { attachment_uuid: document.uuid, name }];

    await updateTemplate(currentTemplate.id, { schema: nextSchema });

    setTemplate((previousTemplate) =>
      previousTemplate?.id === currentTemplate.id
        ? { ...previousTemplate, schema: nextSchema }
        : previousTemplate,
    );
  }

  async function addDocument(file: File) {
    const existingUuids = new Set(
      currentTemplate.documents.map((document) => document.uuid),
    );

    setIsUploadingDocument(true);
    toast.loading("Uploading document", {
      description: file.name,
      id: "template-document-upload",
    });

    try {
      await addTemplateDocument(currentTemplate.id, file);
      const refreshedTemplate = await getTemplate(currentTemplate.id);
      const addedDocument =
        refreshedTemplate.documents.find(
          (document) => !existingUuids.has(document.uuid),
        ) ?? refreshedTemplate.documents.at(-1);

      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(addedDocument?.uuid ?? null);
      toast.success("Document added", {
        description: file.name,
        id: "template-document-upload",
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Document could not be added.";

      toast.error("Document upload failed", {
        description: message,
        id: "template-document-upload",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function replaceDocument(document: TemplateDocument, file: File) {
    const schemaItem = currentTemplate.schema.find(
      (item) => item.attachment_uuid === document.uuid,
    );

    if (!schemaItem) {
      toast.error("Document could not be replaced", {
        description: "The document is missing from the template schema.",
      });
      return;
    }

    setIsUploadingDocument(true);
    toast.loading("Replacing document", {
      description: file.name,
      id: "template-document-upload",
    });

    try {
      const uploadResponse = await addTemplateDocument(
        currentTemplate.id,
        file,
      );
      const replacementSchemaItem = uploadResponse.schema.at(0);
      const replacementDocument = uploadResponse.documents.find(
        (item) => item.uuid === replacementSchemaItem?.attachment_uuid,
      );

      if (!replacementSchemaItem || !replacementDocument) {
        throw new Error("Replacement document was not returned by the API.");
      }

      const nextSchema = currentTemplate.schema.map((item) =>
        item.attachment_uuid === document.uuid
          ? { ...schemaItem, ...replacementSchemaItem }
          : item,
      );
      const nextFields = rewriteFieldAttachmentUuid(
        currentTemplate.fields,
        document.uuid,
        replacementDocument.uuid,
      );

      await updateTemplate(currentTemplate.id, {
        fields: nextFields,
        schema: nextSchema,
      });

      const refreshedTemplate = await getTemplate(currentTemplate.id);
      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(replacementDocument.uuid);
      toast.success("Document replaced", {
        description: file.name,
        id: "template-document-upload",
      });
    } catch (replaceError) {
      const message =
        replaceError instanceof Error
          ? replaceError.message
          : "Document could not be replaced.";

      toast.error("Document replace failed", {
        description: message,
        id: "template-document-upload",
      });
    } finally {
      setIsUploadingDocument(false);
    }
  }

  async function removeDocument(document: TemplateDocument) {
    if (currentTemplate.documents.length <= 1) {
      toast.error("At least one document is required");
      return;
    }

    if (!window.confirm("Remove this document from the template?")) {
      return;
    }

    const nextSchema = currentTemplate.schema.filter(
      (item) => item.attachment_uuid !== document.uuid,
    );
    const nextFields = removeFieldsForAttachment(
      currentTemplate.fields,
      document.uuid,
    );

    try {
      await updateTemplate(currentTemplate.id, {
        fields: nextFields,
        schema: nextSchema,
      });

      const refreshedTemplate = await getTemplate(currentTemplate.id);
      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(refreshedTemplate.documents.at(0)?.uuid ?? null);
      toast.success("Document removed");
    } catch (removeError) {
      const message =
        removeError instanceof Error
          ? removeError.message
          : "Document could not be removed.";

      toast.error("Document remove failed", { description: message });
    }
  }

  async function moveDocument(document: TemplateDocument, direction: -1 | 1) {
    const currentIndex = currentTemplate.schema.findIndex(
      (item) => item.attachment_uuid === document.uuid,
    );
    const nextIndex = currentIndex + direction;

    if (
      currentIndex === -1 ||
      nextIndex < 0 ||
      nextIndex >= currentTemplate.schema.length
    ) {
      return;
    }

    const nextSchema = [...currentTemplate.schema];
    const [movedItem] = nextSchema.splice(currentIndex, 1);
    nextSchema.splice(nextIndex, 0, movedItem);

    try {
      await updateTemplate(currentTemplate.id, { schema: nextSchema });
      const refreshedTemplate = await getTemplate(currentTemplate.id);
      setTemplate(refreshedTemplate);
      setSelectedDocumentUuid(document.uuid);
    } catch (moveError) {
      const message =
        moveError instanceof Error
          ? moveError.message
          : "Document order could not be updated.";

      toast.error("Document reorder failed", { description: message });
    }
  }

  async function openSelfSigningForm() {
    const primarySubmitter = currentSubmitters.at(0);

    if (!primarySubmitter) {
      toast.error("Self-signing form could not be opened", {
        description: "Add a role before signing this template yourself.",
      });
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
        name: currentTemplate.name,
        template_id: currentTemplate.id,
        submitters: [
          {
            email: session?.user.email,
            name: userName || session?.user.email || "Self signer",
            role: primarySubmitter.name ?? "First Party",
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
    } catch (selfSignError) {
      signingWindow?.close();
      const message =
        selfSignError instanceof Error
          ? selfSignError.message
          : "The signing form could not be created.";

      toast.error("Self-signing form could not be opened", {
        description: message,
      });
    } finally {
      setIsOpeningSelfSign(false);
    }
  }

  return {
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
    updateTemplateSharedLink,
    error,
    goBackToTemplates,
    isLoaded: true as const,
    template,
  };
}
