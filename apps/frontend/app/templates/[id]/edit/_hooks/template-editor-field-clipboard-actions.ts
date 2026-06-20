"use client";

import { toast } from "sonner";

import type { TemplateDocument, TemplateResponse } from "@/lib/api/templates";
import {
  FIELD_CLIPBOARD_STORAGE_KEY,
  buildDefaultFieldName,
  getDefaultAreaSize,
  getFieldStringValue,
  getFiniteNumber,
  isRecord,
  normalizeArea,
  normalizeFieldType,
  safeParseJson,
  type TemplateEditorField,
  type TemplateSubmitter,
} from "../_lib/template-editor-model";

type Context = {
  currentFields: TemplateEditorField[];
  currentTemplate: TemplateResponse;
  getEffectiveSelectedFieldUuids: (fieldUuid?: string) => string[];
  persistFields: (
    fields: TemplateEditorField[],
    options?: { successMessage?: string },
  ) => Promise<void>;
  selectedDocument: TemplateDocument | undefined;
  selectedField: TemplateEditorField | null;
  selectedSubmitter: TemplateSubmitter | null;
  setSelectedFieldUuid: (fieldUuid: string | null) => void;
  setSelectedFieldUuids: (fieldUuids: string[]) => void;
};

export function createTemplateEditorFieldClipboardActions(context: Context) {
  const {
    currentFields,
    currentTemplate,
    getEffectiveSelectedFieldUuids,
    persistFields,
    selectedDocument,
    selectedField,
    selectedSubmitter,
    setSelectedFieldUuid,
    setSelectedFieldUuids,
  } = context;

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

  return {
    copySelectedFields,
    pasteCopiedFields,
  };
}
