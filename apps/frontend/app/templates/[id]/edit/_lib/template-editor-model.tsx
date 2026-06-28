import type { ComponentType } from "react";
import {
  AlignJustifyIcon,
  CalendarIcon,
  CheckSquareIcon,
  Columns3Icon,
  CreditCardIcon,
  FileIcon,
  HashIcon,
  ImageIcon,
  ListChecksIcon,
  PaperclipIcon,
  PhoneIcon,
  ScanSearchIcon,
  SignatureIcon,
  StampIcon,
  TextCursorInputIcon,
  TypeIcon,
} from "lucide-react";
import type { TemplateDocument, TemplateResponse } from "@/lib/api/templates";

export type EditorFieldType =
  | "cells"
  | "checkbox"
  | "date"
  | "file"
  | "image"
  | "initials"
  | "multiple"
  | "number"
  | "payment"
  | "phone"
  | "radio"
  | "select"
  | "signature"
  | "stamp"
  | "text";

export type FieldTypeDefinition = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  locked?: boolean;
  type: EditorFieldType;
};

export type TemplateFieldArea = {
  attachment_uuid: string;
  h: number;
  page: number;
  w: number;
  x: number;
  y: number;
  cell_w?: number;
  option_uuid?: string;
  [key: string]: unknown;
};

export type TemplateCustomFieldArea = {
  h?: number;
  option_uuid?: string;
  w?: number;
  x?: number;
  y?: number;
  [key: string]: unknown;
};

export type TemplateEditorField = {
  areas: TemplateFieldArea[];
  name: string;
  required?: boolean;
  submitter_uuid?: string;
  type: EditorFieldType;
  uuid: string;
  [key: string]: unknown;
};

export type TemplateCustomField = {
  areas?: TemplateCustomFieldArea[];
  default_value?: unknown;
  description?: string;
  name: string;
  options?: unknown;
  preferences?: Record<string, unknown>;
  readonly?: boolean;
  required?: boolean;
  title?: string;
  type: EditorFieldType;
  uuid: string;
  validation?: unknown;
  [key: string]: unknown;
};

export type TemplateSubmitter = {
  name?: string;
  uuid: string;
};

export type TemplateFieldCondition = {
  action?: string;
  field_uuid?: string;
  operation?: "or";
  value?: string;
};

export type TemplateFieldOption = {
  uuid: string;
  value: string;
};

export type SubmitterRemovalMode = "keep_fields" | "remove_fields";

export type AreaSize = {
  h: number;
  w: number;
};

export type DrawDraft = {
  area: TemplateFieldArea;
  startX: number;
  startY: number;
};

export type FieldDragPayload =
  | {
      kind: "existing";
      fieldUuid: string;
      optionUuid?: string;
    }
  | {
      kind: "new";
      type: EditorFieldType;
    }
  | {
      customFieldUuid: string;
      kind: "custom";
      type: EditorFieldType;
    };

export const FIELD_DRAG_MIME_TYPE = "application/x-signa-template-field";
export const FIELD_CLIPBOARD_STORAGE_KEY = "signa_template_field_clipboard";

export const submitterColors = [
  "#ef4444",
  "#0ea5e9",
  "#10b981",
  "#fde047",
  "#9333ea",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#6366f1",
];

export const fieldTypes: FieldTypeDefinition[] = [
  { icon: TypeIcon, label: "Text", type: "text" },
  { icon: SignatureIcon, label: "Signature", type: "signature" },
  { icon: TextCursorInputIcon, label: "Initials", type: "initials" },
  { icon: CalendarIcon, label: "Date", type: "date" },
  { icon: HashIcon, label: "Number", type: "number" },
  { icon: ImageIcon, label: "Image", type: "image" },
  { icon: CheckSquareIcon, label: "Checkbox", type: "checkbox" },
  { icon: ListChecksIcon, label: "Multiple", type: "multiple" },
  { icon: PaperclipIcon, label: "File", type: "file" },
  { icon: ScanSearchIcon, label: "Radio", type: "radio" },
  { icon: AlignJustifyIcon, label: "Select", type: "select" },
  { icon: Columns3Icon, label: "Cells", type: "cells" },
  { icon: StampIcon, label: "Stamp", type: "stamp" },
  { icon: CreditCardIcon, label: "Payment", type: "payment" },
  { icon: PhoneIcon, label: "Phone", type: "phone" },
];

export const fieldValidationOptions = [
  { kind: "length", label: "Length" },
  { kind: "ssn", label: "SSN" },
  { kind: "ein", label: "EIN" },
  { kind: "email", label: "Email" },
  { kind: "url", label: "URL" },
  { kind: "zip", label: "ZIP" },
  { kind: "numbers_only", label: "Numbers only" },
  { kind: "letters_only", label: "Letters only" },
];

export const fieldValidationPatterns: Record<string, string> = {
  ein: "^[0-9]{2}-[0-9]{7}$",
  email: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
  letters_only: "^[a-zA-Z]+$",
  numbers_only: "^[0-9]+$",
  ssn: "^[0-9]{3}-[0-9]{2}-[0-9]{4}$",
  url: "^https?://.*",
  zip: "^[0-9]{5}(?:-[0-9]{4})?$",
};

export function createTemplateField({
  area,
  fields,
  submitter,
  type,
}: {
  area: TemplateFieldArea;
  fields: TemplateEditorField[];
  submitter: TemplateSubmitter;
  type: EditorFieldType;
}): TemplateEditorField {
  const typeFields = fields.filter((field) => field.type === type);
  const field: TemplateEditorField = {
    areas: [area],
    name: "",
    required: type !== "checkbox",
    submitter_uuid: submitter.uuid,
    type,
    uuid: crypto.randomUUID(),
  };

  if (["multiple", "radio", "select"].includes(type)) {
    field.options = [
      { uuid: crypto.randomUUID(), value: "" },
      { uuid: crypto.randomUUID(), value: "" },
    ];
  }

  if (type === "stamp") {
    field.readonly = true;
  }

  if (type === "date") {
    field.preferences = { format: "MM/DD/YYYY" };
  }

  field.name = buildDefaultFieldName(type, typeFields.length);

  return field;
}

export function createTemplateFieldFromCustom({
  area,
  customField,
  fields,
  submitter,
}: {
  area: TemplateFieldArea;
  customField: TemplateCustomField;
  fields: TemplateEditorField[];
  submitter: TemplateSubmitter;
}): TemplateEditorField {
  const field = createTemplateField({
    area,
    fields,
    submitter,
    type: customField.type,
  });

  applyCustomFieldAttributes(field, customField);

  return field;
}

export function buildTemplateCustomField(
  field: TemplateEditorField,
): TemplateCustomField {
  const customField: TemplateCustomField = {
    ...structuredClone(field),
    uuid: crypto.randomUUID(),
  };

  delete customField.submitter_uuid;
  delete customField.prefillable;
  delete customField.conditions;
  customField.areas = field.areas.flatMap((area) => {
    if (area.page === null || area.page === undefined) {
      return [];
    }

    const customArea: TemplateCustomFieldArea = { ...area };

    delete customArea.attachment_uuid;
    delete customArea.page;

    return [customArea];
  });

  return customField;
}

export function normalizeTemplateCustomFields(
  fields: unknown[],
): TemplateCustomField[] {
  return fields.flatMap((field) => {
    if (!isRecord(field)) {
      return [];
    }

    const normalized = normalizeTemplateCustomField(field);

    return normalized ? [normalized] : [];
  });
}

export function applyCustomFieldAttributes(
  field: TemplateEditorField,
  customField: TemplateCustomField,
): void {
  const skipKeys = new Set([
    "areas",
    "conditions",
    "prefillable",
    "role",
    "submitter_uuid",
    "uuid",
  ]);

  Object.entries(customField).forEach(([key, value]) => {
    if (skipKeys.has(key) || value === null || value === undefined) {
      return;
    }

    if (key === "options") {
      field.options = normalizeCustomFieldOptions(value);
      return;
    }

    field[key] =
      typeof value === "object" ? structuredClone(value) : value;
  });
}

export function buildFieldTypeUpdate(
  field: TemplateEditorField,
  type: EditorFieldType,
): Partial<TemplateEditorField> {
  const patch: Partial<TemplateEditorField> = {
    required: type !== "checkbox",
    type,
  };

  if (["multiple", "radio", "select"].includes(type)) {
    patch.options =
      Array.isArray(field.options) && field.options.length > 0
        ? field.options
        : [
            { uuid: crypto.randomUUID(), value: "" },
            { uuid: crypto.randomUUID(), value: "" },
          ];
  } else {
    patch.options = undefined;
  }

  if (type === "stamp") {
    patch.readonly = true;
  } else if (field.readonly === true) {
    patch.readonly = false;
  }

  if (type === "date") {
    const preferences = isRecord(field.preferences) ? field.preferences : {};
    patch.preferences = {
      ...preferences,
      format:
        typeof preferences.format === "string"
          ? preferences.format
          : "MM/DD/YYYY",
    };
  }

  if (type === "checkbox") {
    patch.default_value = field.default_value === true;
  } else if (typeof field.default_value === "boolean") {
    patch.default_value = "";
  }

  return patch;
}

export function buildDefaultFieldName(
  type: EditorFieldType,
  index: number,
): string {
  const label = getFieldTypeDefinition(type)?.label ?? "Field";
  const suffix = index + 1;

  if (type === "text") {
    return `Text Field ${suffix}`;
  }

  return `${label} Field ${suffix}`;
}

export function normalizeTemplateFields(
  fields: unknown[],
): TemplateEditorField[] {
  return fields.flatMap((field) => {
    if (!isRecord(field)) {
      return [];
    }

    const type = normalizeFieldType(field.type);
    const uuid =
      typeof field.uuid === "string" ? field.uuid : crypto.randomUUID();
    const areas = Array.isArray(field.areas)
      ? field.areas.flatMap((area) => normalizeTemplateArea(area, type))
      : [];

    return [
      {
        ...field,
        areas,
        name: typeof field.name === "string" ? field.name : "",
        type,
        uuid,
      } satisfies TemplateEditorField,
    ];
  });
}

function normalizeTemplateCustomField(
  field: Record<string, unknown>,
): TemplateCustomField | null {
  const type = normalizeFieldType(field.type);
  const uuid =
    typeof field.uuid === "string" ? field.uuid : crypto.randomUUID();
  const name = typeof field.name === "string" ? field.name : "";
  const areas = Array.isArray(field.areas)
    ? field.areas.flatMap(normalizeCustomFieldArea)
    : [];

  if (!name && !type) {
    return null;
  }

  return {
    ...field,
    areas,
    name,
    type,
    uuid,
  } satisfies TemplateCustomField;
}

function normalizeCustomFieldArea(area: unknown): TemplateCustomFieldArea[] {
  if (!isRecord(area)) {
    return [];
  }

  return [
    {
      ...area,
      h: getFiniteNumber(area.h, 0.04),
      w: getFiniteNumber(area.w, 0.2),
      x: getFiniteNumber(area.x, 0),
      y: getFiniteNumber(area.y, 0),
    },
  ];
}

function normalizeCustomFieldOptions(value: unknown): TemplateFieldOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option) => {
    if (typeof option === "string") {
      return [{ uuid: crypto.randomUUID(), value: option }];
    }

    if (!isRecord(option)) {
      return [];
    }

    return [
      {
        uuid: crypto.randomUUID(),
        value: typeof option.value === "string" ? option.value : "",
      },
    ];
  });
}

export function normalizeTemplateSubmitters(
  submitters: unknown[],
): TemplateSubmitter[] {
  const normalized = submitters.flatMap((submitter, index) => {
    if (!isRecord(submitter)) {
      return [];
    }

    const uuid =
      typeof submitter.uuid === "string" ? submitter.uuid : crypto.randomUUID();
    const name =
      typeof submitter.name === "string" && submitter.name.trim()
        ? submitter.name
        : getPartyName(index);

    return [{ ...submitter, name, uuid } satisfies TemplateSubmitter];
  });

  return normalized.length
    ? normalized
    : [{ name: "First Party", uuid: crypto.randomUUID() }];
}

export function normalizeTemplateArea(
  area: unknown,
  type: EditorFieldType,
): TemplateFieldArea[] {
  if (!isRecord(area)) {
    return [];
  }

  const attachmentUuid = area.attachment_uuid;
  const page = area.page;

  if (typeof attachmentUuid !== "string" || typeof page !== "number") {
    return [];
  }

  return [
    normalizeArea(
      {
        ...area,
        attachment_uuid: attachmentUuid,
        h: getFiniteNumber(area.h, 0.04),
        page,
        w: getFiniteNumber(area.w, 0.2),
        x: getFiniteNumber(area.x, 0),
        y: getFiniteNumber(area.y, 0),
      },
      type,
    ),
  ];
}

export function normalizeFieldType(value: unknown): EditorFieldType {
  return fieldTypes.some((fieldType) => fieldType.type === value)
    ? (value as EditorFieldType)
    : "text";
}

export function getFieldTypeDefinition(
  type: EditorFieldType,
): FieldTypeDefinition | undefined {
  return fieldTypes.find((fieldType) => fieldType.type === type);
}

export async function downloadUrlsSequentially(urls: string[]) {
  for (const url of urls) {
    await downloadUrl(url);
  }
}

export async function downloadUrl(url: string) {
  const response = await fetch(url);
  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = decodeURIComponent(url.split("/").at(-1) ?? "document.pdf");
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export function getFieldOptions(
  field: TemplateEditorField,
): TemplateFieldOption[] {
  if (!Array.isArray(field.options)) {
    return [
      { uuid: crypto.randomUUID(), value: "" },
      { uuid: crypto.randomUUID(), value: "" },
    ];
  }

  return field.options.flatMap((option) => {
    if (!isRecord(option)) {
      return [];
    }

    return [
      {
        uuid:
          typeof option.uuid === "string" ? option.uuid : crypto.randomUUID(),
        value: typeof option.value === "string" ? option.value : "",
      },
    ];
  });
}

export function getFieldConditions(
  field: TemplateEditorField,
): TemplateFieldCondition[] {
  if (!Array.isArray(field.conditions)) {
    return [];
  }

  return field.conditions.flatMap((condition) => {
    if (!isRecord(condition)) {
      return [];
    }

    return [
      {
        action:
          typeof condition.action === "string" ? condition.action : undefined,
        field_uuid:
          typeof condition.field_uuid === "string"
            ? condition.field_uuid
            : undefined,
        operation: condition.operation === "or" ? "or" : undefined,
        value:
          typeof condition.value === "string" ? condition.value : undefined,
      },
    ];
  });
}

export function isChoiceField(type: EditorFieldType): boolean {
  return ["multiple", "radio", "select"].includes(type);
}

export function getDefaultFieldFormat(type: EditorFieldType): string {
  if (type === "number") {
    return "none";
  }

  return "MM/DD/YYYY";
}

export function getFieldFormats(type: EditorFieldType): string[] {
  if (type === "number") {
    return ["none", "usd", "eur", "gbp", "comma", "dot", "space", "percent"];
  }

  return [
    "MM/DD/YYYY",
    "DD/MM/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "DD.MM.YYYY",
    "MMM D, YYYY",
    "MMMM D, YYYY",
    "MMMM YYYY",
    "D MMM YYYY",
    "D MMMM YYYY",
  ];
}

export function getValidationKind(field: TemplateEditorField): string {
  const validation = isRecord(field.validation) ? field.validation : {};
  const pattern = getFieldStringValue(validation.pattern);

  if (!pattern) {
    return "";
  }

  if (parseLengthValidation(pattern)) {
    return "length";
  }

  const preset = Object.entries(fieldValidationPatterns).find(
    ([, value]) => value === pattern,
  );

  return preset?.[0] ?? "custom";
}

export function getValidationPattern(kind: string): string {
  return fieldValidationPatterns[kind] ?? "";
}

export function parseLengthValidation(
  pattern: string,
): { max: string; min: string } | null {
  const match = pattern.match(/^\.{(\d+),(\d+)?}$/);

  if (!match) {
    return null;
  }

  return {
    max: match[2] ?? "",
    min: match[1] ?? "",
  };
}

export function getConditionActions(field?: TemplateEditorField): string[] {
  if (!field) {
    return [];
  }

  if (field.type === "checkbox") {
    return ["checked", "unchecked"];
  }

  if (["radio", "select"].includes(field.type)) {
    return ["equal", "not_equal"];
  }

  if (field.type === "multiple") {
    return ["contains", "does_not_contain"];
  }

  if (field.type === "number") {
    return [
      "not_empty",
      "empty",
      "equal",
      "not_equal",
      "greater_than",
      "less_than",
    ];
  }

  return ["not_empty", "empty"];
}

export function requiresConditionValue(
  field: TemplateEditorField | undefined,
  action?: string,
): boolean {
  if (!field || !action) {
    return false;
  }

  if (isChoiceField(field.type)) {
    return ["equal", "not_equal", "contains", "does_not_contain"].includes(
      action,
    );
  }

  return (
    field.type === "number" &&
    ["equal", "not_equal", "greater_than", "less_than"].includes(action)
  );
}

export function humanizeConditionAction(action: string): string {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createsConditionCycle(
  fields: TemplateEditorField[],
  sourceFieldUuid: string,
  targetFieldUuid: string,
  visited = new Set<string>(),
): boolean {
  if (sourceFieldUuid === targetFieldUuid) {
    return true;
  }

  if (visited.has(sourceFieldUuid)) {
    return false;
  }

  visited.add(sourceFieldUuid);
  const sourceField = fields.find((field) => field.uuid === sourceFieldUuid);

  if (!sourceField) {
    return false;
  }

  return getFieldConditions(sourceField).some(
    (condition) =>
      Boolean(condition.field_uuid) &&
      createsConditionCycle(
        fields,
        condition.field_uuid as string,
        targetFieldUuid,
        visited,
      ),
  );
}

export function getSubmitterColor(
  submitters: TemplateSubmitter[],
  submitterUuid?: string,
): string {
  const index = Math.max(
    0,
    submitters.findIndex((submitter) => submitter.uuid === submitterUuid),
  );

  return submitterColors[index % submitterColors.length];
}

export function getSubmitterName(
  submitters: TemplateSubmitter[],
  submitterUuid?: string,
): string {
  const index = Math.max(
    0,
    submitters.findIndex((submitter) => submitter.uuid === submitterUuid),
  );
  const submitter = submitters[index];

  return submitter?.name || getPartyName(index);
}

export function getPartyName(index: number): string {
  const names = [
    "First Party",
    "Second Party",
    "Third Party",
    "Fourth Party",
    "Fifth Party",
    "Sixth Party",
    "Seventh Party",
    "Eighth Party",
    "Ninth Party",
    "Tenth Party",
  ];

  if (names[index]) {
    return names[index];
  }

  return `${index + 1}${getOrdinalSuffix(index + 1)} Party`;
}

export function getOrdinalSuffix(value: number): string {
  if (value % 10 === 1 && value % 100 !== 11) {
    return "st";
  }

  if (value % 10 === 2 && value % 100 !== 12) {
    return "nd";
  }

  if (value % 10 === 3 && value % 100 !== 13) {
    return "rd";
  }

  return "th";
}

export function isTextEditableField(type: EditorFieldType): boolean {
  return ["date", "initials", "number", "text"].includes(type);
}

export function getFieldStringValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

export function getAutosizeInputCh(value: string): number {
  return Math.min(Math.max(value.length + 0.5, 2), 32);
}

export function writeFieldDragPayload(
  dataTransfer: DataTransfer,
  payload: FieldDragPayload,
) {
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(FIELD_DRAG_MIME_TYPE, JSON.stringify(payload));
  dataTransfer.setData("text/plain", "Signa field");
}

export function hasFieldDragPayload(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(FIELD_DRAG_MIME_TYPE);
}

export function readFieldDragPayload(
  dataTransfer: DataTransfer,
): FieldDragPayload | null {
  const rawPayload = dataTransfer.getData(FIELD_DRAG_MIME_TYPE);

  if (!rawPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(rawPayload) as unknown;

    if (!isRecord(payload) || typeof payload.kind !== "string") {
      return null;
    }

    if (payload.kind === "new" && typeof payload.type === "string") {
      return { kind: "new", type: normalizeFieldType(payload.type) };
    }

    if (payload.kind === "existing" && typeof payload.fieldUuid === "string") {
      return {
        fieldUuid: payload.fieldUuid,
        kind: "existing",
        optionUuid:
          typeof payload.optionUuid === "string"
            ? payload.optionUuid
            : undefined,
      };
    }

    if (
      payload.kind === "custom" &&
      typeof payload.customFieldUuid === "string"
    ) {
      return {
        customFieldUuid: payload.customFieldUuid,
        kind: "custom",
        type: normalizeFieldType(payload.type),
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function insertFieldSorted(
  fields: TemplateEditorField[],
  field: TemplateEditorField,
): TemplateEditorField[] {
  return [...fields, field].sort(compareFieldsByFirstArea);
}

export function compareFieldsByFirstArea(
  firstField: TemplateEditorField,
  secondField: TemplateEditorField,
): number {
  const firstArea = firstField.areas.at(0);
  const secondArea = secondField.areas.at(0);

  if (!firstArea || !secondArea) {
    return firstArea ? -1 : secondArea ? 1 : 0;
  }

  return compareAreas(firstArea, secondArea);
}

export function compareAreas(
  firstArea: TemplateFieldArea,
  secondArea: TemplateFieldArea,
) {
  if (firstArea.attachment_uuid !== secondArea.attachment_uuid) {
    return firstArea.attachment_uuid.localeCompare(secondArea.attachment_uuid);
  }

  if (firstArea.page !== secondArea.page) {
    return firstArea.page - secondArea.page;
  }

  if (Math.abs(firstArea.y - secondArea.y) > 0.01) {
    return firstArea.y - secondArea.y;
  }

  return firstArea.x - secondArea.x;
}

export function centerDefaultArea({
  attachmentUuid,
  pageIndex,
  pageAspectRatio,
  pointer,
  type,
}: {
  attachmentUuid: string;
  pageIndex: number;
  pageAspectRatio?: number;
  pointer: { x: number; y: number };
  type: EditorFieldType;
}): TemplateFieldArea {
  const size = getDefaultAreaSize(type, pageAspectRatio);

  return normalizeArea(
    {
      attachment_uuid: attachmentUuid,
      h: size.h,
      page: pageIndex,
      w: size.w,
      x: pointer.x - size.w / 2,
      y: pointer.y - size.h / 2,
      ...(type === "cells" ? { cell_w: size.w / 5 } : null),
    },
    type,
  );
}

export function getDefaultAreaSize(
  type: EditorFieldType,
  pageAspectRatio = 612 / 792,
): AreaSize {
  if (["checkbox", "multiple", "radio"].includes(type)) {
    return { h: (1 / 30) * pageAspectRatio, w: 1 / 30 };
  }

  if (type === "image") {
    return { h: 0.2 * pageAspectRatio, w: 0.2 };
  }

  if (["signature", "stamp"].includes(type)) {
    return { h: (0.2 * pageAspectRatio) / 2, w: 0.2 };
  }

  if (type === "initials") {
    return { h: 1 / 35, w: 0.1 };
  }

  if (type === "cells") {
    return { h: 1 / 35, w: 0.2 };
  }

  return { h: 1 / 35, w: 0.2 };
}

export function normalizeArea(
  area: TemplateFieldArea,
  type: EditorFieldType = "text",
): TemplateFieldArea {
  void type;

  const w = Math.min(Math.max(area.w, 0), 1);
  const h = Math.min(Math.max(area.h, 0), 1);

  return {
    ...area,
    h,
    w,
    x: Math.min(Math.max(area.x, 0), 1 - w),
    y: Math.min(Math.max(area.y, 0), 1 - h),
  };
}

export function areaToStyle(area: TemplateFieldArea) {
  return {
    height: `${area.h * 100}%`,
    left: `${area.x * 100}%`,
    top: `${area.y * 100}%`,
    width: `${area.w * 100}%`,
  };
}

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function getFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function DocumentThumbnail({
  document,
}: {
  document?: TemplateDocument;
}) {
  const previewImage = document?.preview_images.at(0);
  const previewUrl = previewImage?.url ?? document?.preview_image_url;

  return (
    <div className="flex h-[276px] items-center justify-center overflow-hidden rounded bg-white">
      {previewUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={document?.filename ?? "Document"}
            className="h-full w-full object-contain"
            loading="lazy"
            src={previewUrl}
          />
        </>
      ) : (
        <FileIcon className="size-10 text-muted-foreground" />
      )}
    </div>
  );
}

export function getDocumentDisplayName(
  template: TemplateResponse,
  document: TemplateDocument,
): string {
  return (
    template.schema.find((item) => item.attachment_uuid === document.uuid)
      ?.name ??
    removeExtension(document.filename) ??
    document.filename
  );
}

export function removeExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, "");
}

export function rewriteFieldAttachmentUuid(
  fields: unknown[],
  previousAttachmentUuid: string,
  nextAttachmentUuid: string,
): unknown[] {
  return fields.map((field) => {
    if (!isRecord(field) || !Array.isArray(field.areas)) {
      return field;
    }

    return {
      ...field,
      areas: field.areas.map((area) =>
        isRecord(area) && area.attachment_uuid === previousAttachmentUuid
          ? { ...area, attachment_uuid: nextAttachmentUuid }
          : area,
      ),
    };
  });
}

export function removeFieldsForAttachment(
  fields: unknown[],
  attachmentUuid: string,
): unknown[] {
  return fields.reduce<unknown[]>((nextFields, field) => {
    if (!isRecord(field) || !Array.isArray(field.areas)) {
      nextFields.push(field);
      return nextFields;
    }

    const nextAreas = field.areas.filter(
      (area) => !isRecord(area) || area.attachment_uuid !== attachmentUuid,
    );

    if (nextAreas.length > 0) {
      nextFields.push({ ...field, areas: nextAreas });
    }

    return nextFields;
  }, []);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getPreviewDimension(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}
