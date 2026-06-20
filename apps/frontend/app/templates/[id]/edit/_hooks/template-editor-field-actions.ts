"use client";

import { toast } from "sonner";

import type { TemplateDocument, TemplateResponse } from "@/lib/api/templates";
import {
  centerDefaultArea,
  createTemplateField,
  insertFieldSorted,
  normalizeArea,
  type EditorFieldType,
  type FieldDragPayload,
  type TemplateEditorField,
  type TemplateFieldArea,
  type TemplateSubmitter,
} from "../_lib/template-editor-model";
import { createTemplateEditorFieldClipboardActions } from "./template-editor-field-clipboard-actions";

type Context = {
  activeFieldType: EditorFieldType | null;
  currentFields: TemplateEditorField[];
  currentTemplate: TemplateResponse;
  getEffectiveSelectedFieldUuids: (fieldUuid?: string) => string[];
  persistFields: (
    fields: TemplateEditorField[],
    options?: { successMessage?: string },
  ) => Promise<void>;
  persistTemplateStructure: (options: {
    fields?: TemplateEditorField[];
    submitters?: TemplateSubmitter[];
    successMessage?: string;
  }) => Promise<void>;
  selectField: (fieldUuid: string | null, additive?: boolean) => void;
  selectedDocument: TemplateDocument | undefined;
  selectedField: TemplateEditorField | null;
  selectedSubmitter: TemplateSubmitter | null;
  setActiveFieldType: (fieldType: EditorFieldType | null) => void;
  setSelectedDocumentUuid: (documentUuid: string | null) => void;
  setSelectedFieldUuid: (fieldUuid: string | null) => void;
  setSelectedFieldUuids: (fieldUuids: string[]) => void;
};

export function createTemplateEditorFieldActions(context: Context) {
  const {
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
  } = context;
  const { copySelectedFields, pasteCopiedFields } =
    createTemplateEditorFieldClipboardActions({
      currentFields,
      currentTemplate,
      getEffectiveSelectedFieldUuids,
      persistFields,
      selectedDocument,
      selectedField,
      selectedSubmitter,
      setSelectedFieldUuid,
      setSelectedFieldUuids,
    });

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

  return {
    addDroppedField,
    addFieldWithoutDrawing,
    copyFieldToAllPages,
    copySelectedFields,
    createField,
    deleteField,
    deleteSelectedFields,
    goToFieldArea,
    goToFieldPage,
    moveFieldInOrder,
    moveFieldToIndex,
    nudgeSelectedFields,
    pasteCopiedFields,
    startDrawNewArea,
    updateField,
    updateFieldAndTemplate,
    updateFieldArea,
  };
}
