"use client";

import type {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import { CheckSquareIcon, Trash2Icon, TypeIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  TemplateDocument,
  TemplateDocumentPreviewImage,
  TemplateResponse,
} from "@/lib/api/templates";
import { cn } from "@/lib/utils";
import {
  areaToStyle,
  buildDefaultFieldName,
  buildFieldTypeUpdate,
  centerDefaultArea,
  clamp01,
  fieldTypes,
  getAutosizeInputCh,
  getDocumentDisplayName,
  getFieldConditions,
  getFieldStringValue,
  getFieldTypeDefinition,
  getPreviewDimension,
  getPartyName,
  getSubmitterColor,
  hasFieldDragPayload,
  isTextEditableField,
  normalizeArea,
  readFieldDragPayload,
  submitterColors,
  type DrawDraft,
  type EditorFieldType,
  type FieldDragPayload,
  type TemplateEditorField,
  type TemplateFieldArea,
  type TemplateSubmitter,
} from "../../_lib/template-editor-model";

export function TemplateCanvas({
  activeFieldType,
  documents,
  fields,
  isSavingFields,
  onCopySelectedFields,
  onCreateField,
  onDeleteField,
  onDeleteSelectedFields,
  onDropField,
  onNudgeSelectedFields,
  onPasteCopiedFields,
  onSelectField,
  onUpdateField,
  onUpdateFieldArea,
  selectedFieldUuid,
  selectedFieldUuids,
  selectedDocumentUuid,
  submitters,
  template,
}: {
  activeFieldType: EditorFieldType | null;
  documents: TemplateDocument[];
  fields: TemplateEditorField[];
  isSavingFields: boolean;
  onCopySelectedFields: (fieldUuid?: string) => void;
  onCreateField: (area: TemplateFieldArea) => Promise<void>;
  onDeleteField: (fieldUuid: string) => Promise<void>;
  onDeleteSelectedFields: (fieldUuid?: string) => Promise<void>;
  onDropField: (
    payload: FieldDragPayload,
    area: TemplateFieldArea,
  ) => Promise<void>;
  onNudgeSelectedFields: (
    fieldUuid: string,
    dx: number,
    dy: number,
  ) => Promise<void>;
  onPasteCopiedFields: () => Promise<void>;
  onSelectField: (fieldUuid: string | null, additive?: boolean) => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  onUpdateFieldArea: (
    fieldUuid: string,
    areaIndex: number,
    area: TemplateFieldArea,
  ) => Promise<void>;
  selectedFieldUuid: string | null;
  selectedFieldUuids: string[];
  selectedDocumentUuid: string | null;
  submitters: TemplateSubmitter[];
  template: TemplateResponse;
}) {
  const documentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedDocumentUuid) {
      return;
    }

    documentRefs.current[selectedDocumentUuid]?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [selectedDocumentUuid]);

  return (
    <section className="min-h-0 overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--auth-background),var(--auth-muted)_45%)] p-4 [scrollbar-gutter:stable]">
      <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-8 pb-8">
        {documents.length > 0 ? (
          documents.map((document) => (
            <TemplateCanvasDocument
              activeFieldType={activeFieldType}
              document={document}
              fields={fields}
              isSelected={document.uuid === selectedDocumentUuid}
              isSavingFields={isSavingFields}
              onCopySelectedFields={onCopySelectedFields}
              key={document.uuid}
              name={getDocumentDisplayName(template, document)}
              onCreateField={onCreateField}
              onDeleteField={onDeleteField}
              onDeleteSelectedFields={onDeleteSelectedFields}
              onDropField={onDropField}
              onNudgeSelectedFields={onNudgeSelectedFields}
              onPasteCopiedFields={onPasteCopiedFields}
              onSelectField={onSelectField}
              onUpdateField={onUpdateField}
              onUpdateFieldArea={onUpdateFieldArea}
              selectedFieldUuid={selectedFieldUuid}
              selectedFieldUuids={selectedFieldUuids}
              submitters={submitters}
              ref={(node) => {
                documentRefs.current[document.uuid] = node;
              }}
            />
          ))
        ) : (
          <div className="flex min-h-[990px] items-center justify-center rounded border border-[var(--auth-input-border)] bg-white text-sm text-muted-foreground shadow-sm">
            Document preview is not available yet.
          </div>
        )}
      </div>
    </section>
  );
}

export function TemplateCanvasDocument({
  activeFieldType,
  document,
  fields,
  isSelected,
  isSavingFields,
  name,
  onCopySelectedFields,
  onCreateField,
  onDeleteField,
  onDeleteSelectedFields,
  onDropField,
  onNudgeSelectedFields,
  onPasteCopiedFields,
  onSelectField,
  onUpdateField,
  onUpdateFieldArea,
  selectedFieldUuid,
  selectedFieldUuids,
  submitters,
  ref,
}: {
  activeFieldType: EditorFieldType | null;
  document: TemplateDocument;
  fields: TemplateEditorField[];
  isSelected: boolean;
  isSavingFields: boolean;
  name: string;
  onCopySelectedFields: (fieldUuid?: string) => void;
  onCreateField: (area: TemplateFieldArea) => Promise<void>;
  onDeleteField: (fieldUuid: string) => Promise<void>;
  onDeleteSelectedFields: (fieldUuid?: string) => Promise<void>;
  onDropField: (
    payload: FieldDragPayload,
    area: TemplateFieldArea,
  ) => Promise<void>;
  onNudgeSelectedFields: (
    fieldUuid: string,
    dx: number,
    dy: number,
  ) => Promise<void>;
  onPasteCopiedFields: () => Promise<void>;
  onSelectField: (fieldUuid: string | null, additive?: boolean) => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  onUpdateFieldArea: (
    fieldUuid: string,
    areaIndex: number,
    area: TemplateFieldArea,
  ) => Promise<void>;
  selectedFieldUuid: string | null;
  selectedFieldUuids: string[];
  submitters: TemplateSubmitter[];
  ref: (node: HTMLDivElement | null) => void;
}) {
  const previewImages = document.preview_images ?? [];

  return (
    <div className="scroll-mt-4" ref={ref}>
      {previewImages.length > 0 ? (
        <div className="flex flex-col gap-4">
          {previewImages.map((previewImage, index) => (
            <DocumentPageImage
              activeFieldType={activeFieldType}
              documentUuid={document.uuid}
              fields={fields}
              filename={document.filename}
              isSelected={isSelected && index === 0}
              isSavingFields={isSavingFields}
              onCopySelectedFields={onCopySelectedFields}
              key={previewImage.id}
              onCreateField={onCreateField}
              onDeleteField={onDeleteField}
              onDeleteSelectedFields={onDeleteSelectedFields}
              onDropField={onDropField}
              onNudgeSelectedFields={onNudgeSelectedFields}
              onPasteCopiedFields={onPasteCopiedFields}
              onSelectField={onSelectField}
              onUpdateField={onUpdateField}
              onUpdateFieldArea={onUpdateFieldArea}
              pageIndex={index}
              previewImage={previewImage}
              selectedFieldUuid={selectedFieldUuid}
              selectedFieldUuids={selectedFieldUuids}
              submitters={submitters}
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-[990px] items-center justify-center rounded border border-[var(--auth-input-border)] bg-white text-sm text-muted-foreground shadow-sm">
          {name} preview is not available yet.
        </div>
      )}
    </div>
  );
}

export function DocumentPageImage({
  activeFieldType,
  documentUuid,
  fields,
  filename,
  isSelected,
  isSavingFields,
  onCopySelectedFields,
  onCreateField,
  onDeleteField,
  onDeleteSelectedFields,
  onDropField,
  onNudgeSelectedFields,
  onPasteCopiedFields,
  onSelectField,
  onUpdateField,
  onUpdateFieldArea,
  pageIndex,
  previewImage,
  selectedFieldUuid,
  selectedFieldUuids,
  submitters,
}: {
  activeFieldType: EditorFieldType | null;
  documentUuid: string;
  fields: TemplateEditorField[];
  filename: string;
  isSelected?: boolean;
  isSavingFields: boolean;
  onCopySelectedFields: (fieldUuid?: string) => void;
  onCreateField: (area: TemplateFieldArea) => Promise<void>;
  onDeleteField: (fieldUuid: string) => Promise<void>;
  onDeleteSelectedFields: (fieldUuid?: string) => Promise<void>;
  onDropField: (
    payload: FieldDragPayload,
    area: TemplateFieldArea,
  ) => Promise<void>;
  onNudgeSelectedFields: (
    fieldUuid: string,
    dx: number,
    dy: number,
  ) => Promise<void>;
  onPasteCopiedFields: () => Promise<void>;
  onSelectField: (fieldUuid: string | null, additive?: boolean) => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  onUpdateFieldArea: (
    fieldUuid: string,
    areaIndex: number,
    area: TemplateFieldArea,
  ) => Promise<void>;
  pageIndex: number;
  previewImage: TemplateDocumentPreviewImage;
  selectedFieldUuid: string | null;
  selectedFieldUuids: string[];
  submitters: TemplateSubmitter[];
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [drawDraft, setDrawDraft] = useState<DrawDraft | null>(null);
  const width = getPreviewDimension(previewImage.metadata.width, 1400);
  const height = getPreviewDimension(previewImage.metadata.height, 1812);
  const pageFields = fields.flatMap((field) =>
    field.areas.flatMap((area, areaIndex) =>
      area.attachment_uuid === documentUuid && area.page === pageIndex
        ? [{ area, areaIndex, field }]
        : [],
    ),
  );

  function getPointerArea(event: ReactPointerEvent<HTMLDivElement>) {
    const page = pageRef.current;

    if (!page) {
      return null;
    }

    const rect = page.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);

    return { x, y };
  }

  function getDragPointerArea(event: ReactDragEvent<HTMLDivElement>) {
    const page = pageRef.current;

    if (!page) {
      return null;
    }

    const rect = page.getBoundingClientRect();
    const x = clamp01((event.clientX - rect.left) / rect.width);
    const y = clamp01((event.clientY - rect.top) / rect.height);

    return { x, y };
  }

  function startDraw(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || isSavingFields || !activeFieldType) {
      return;
    }

    const pointer = getPointerArea(event);

    if (!pointer) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectField(null);
    setDrawDraft({
      area: {
        attachment_uuid: documentUuid,
        h: 0,
        page: pageIndex,
        w: 0,
        x: pointer.x,
        y: pointer.y,
      },
      startX: pointer.x,
      startY: pointer.y,
    });
  }

  function updateDraw(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = getPointerArea(event);

    if (!activeFieldType || !drawDraft || !pointer) {
      return;
    }

    const x = Math.min(drawDraft.startX, pointer.x);
    const y = Math.min(drawDraft.startY, pointer.y);
    const w = Math.abs(pointer.x - drawDraft.startX);
    const h = Math.abs(pointer.y - drawDraft.startY);

    setDrawDraft({
      ...drawDraft,
      area: {
        ...drawDraft.area,
        h,
        w,
        x,
        y,
      },
    });
  }

  function finishDraw(event: ReactPointerEvent<HTMLDivElement>) {
    const pointer = getPointerArea(event);

    if (!activeFieldType || !drawDraft || !pointer) {
      return;
    }

    const area = drawDraft.area;
    const nextArea =
      area.w < 0.008 && area.h < 0.008
        ? centerDefaultArea({
            attachmentUuid: documentUuid,
            pageIndex,
            pointer,
            type: activeFieldType,
          })
        : normalizeArea(area, activeFieldType);

    setDrawDraft(null);
    void onCreateField(nextArea);
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    if (!hasFieldDragPayload(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    const payload = readFieldDragPayload(event.dataTransfer);
    const pointer = getDragPointerArea(event);

    if (!payload || !pointer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const type =
      payload.kind === "new"
        ? payload.type
        : (fields.find((field) => field.uuid === payload.fieldUuid)?.type ??
          "text");

    void onDropField(
      payload,
      centerDefaultArea({
        attachmentUuid: documentUuid,
        pageIndex,
        pointer,
        type,
      }),
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded border bg-white shadow-sm transition-shadow",
        isSelected
          ? "border-[var(--auth-accent)] ring-1 ring-[var(--auth-accent)]"
          : "border-[var(--auth-input-border)]",
      )}
      onPointerCancel={() => setDrawDraft(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerDown={startDraw}
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "v"
        ) {
          event.preventDefault();
          void onPasteCopiedFields();
        }
      }}
      onPointerMove={updateDraw}
      onPointerUp={finishDraw}
      ref={pageRef}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* Short-lived signed blob URLs are rendered directly, matching DocuSeal's image-page builder. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${filename} page ${pageIndex + 1}`}
        className="h-full w-full rounded object-contain"
        height={height}
        loading="lazy"
        src={previewImage.url}
        width={width}
      />
      <div className="absolute inset-0" data-page-layer>
        {pageFields.map(({ area, areaIndex, field }) => (
          <FieldAreaOverlay
            area={area}
            areaIndex={areaIndex}
            field={field}
            isSelected={field.uuid === selectedFieldUuid}
            isMultiSelected={selectedFieldUuids.includes(field.uuid)}
            isSaving={isSavingFields}
            key={`${field.uuid}-${areaIndex}`}
            onCopySelectedFields={onCopySelectedFields}
            onDeleteField={onDeleteField}
            onDeleteSelectedFields={onDeleteSelectedFields}
            onNudgeSelectedFields={onNudgeSelectedFields}
            onPasteCopiedFields={onPasteCopiedFields}
            onSelectField={onSelectField}
            onUpdateField={onUpdateField}
            onUpdateFieldArea={onUpdateFieldArea}
            submitters={submitters}
          />
        ))}
        {drawDraft ? (
          <div
            className="pointer-events-none absolute rounded border-2 border-dashed border-red-500 bg-red-500/10"
            style={areaToStyle(drawDraft.area)}
          />
        ) : null}
      </div>
    </div>
  );
}

export function FieldAreaOverlay({
  area,
  areaIndex,
  field,
  isMultiSelected,
  isSaving,
  isSelected,
  onCopySelectedFields,
  onDeleteField,
  onDeleteSelectedFields,
  onNudgeSelectedFields,
  onPasteCopiedFields,
  onSelectField,
  onUpdateField,
  onUpdateFieldArea,
  submitters,
}: {
  area: TemplateFieldArea;
  areaIndex: number;
  field: TemplateEditorField;
  isMultiSelected: boolean;
  isSaving: boolean;
  isSelected: boolean;
  onCopySelectedFields: (fieldUuid?: string) => void;
  onDeleteField: (fieldUuid: string) => Promise<void>;
  onDeleteSelectedFields: (fieldUuid?: string) => Promise<void>;
  onNudgeSelectedFields: (
    fieldUuid: string,
    dx: number,
    dy: number,
  ) => Promise<void>;
  onPasteCopiedFields: () => Promise<void>;
  onSelectField: (fieldUuid: string | null, additive?: boolean) => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  onUpdateFieldArea: (
    fieldUuid: string,
    areaIndex: number,
    area: TemplateFieldArea,
  ) => Promise<void>;
  submitters: TemplateSubmitter[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const [isRenamingLabel, setIsRenamingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [interaction, setInteraction] = useState<{
    area: TemplateFieldArea;
    mode: "move" | "resize";
    startArea: TemplateFieldArea;
    startX: number;
    startY: number;
  } | null>(null);
  const displayArea = interaction?.area ?? area;
  const typeMeta = getFieldTypeDefinition(field.type);
  const Icon = typeMeta?.icon ?? TypeIcon;
  const title = field.name || buildDefaultFieldName(field.type, 0);
  const roleColor = getSubmitterColor(submitters, field.submitter_uuid);
  const defaultValue = getFieldStringValue(field.default_value);
  const checkedValue = field.default_value === true;
  const conditionCount = getFieldConditions(field).length;
  const hasDisplayValue = Boolean(defaultValue);
  const hasVisibleContent =
    (isTextEditableField(field.type) && hasDisplayValue) ||
    (field.type === "checkbox" && checkedValue);
  const shouldShowLabel = isSelected || isRenamingLabel || !hasVisibleContent;

  useEffect(() => {
    if (isSelected && isTextEditableField(field.type)) {
      inputRef.current?.focus();
    }
  }, [field.type, isSelected]);

  useEffect(() => {
    if (isRenamingLabel) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
    }
  }, [isRenamingLabel]);

  function startInteraction(
    mode: "move" | "resize",
    event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>,
  ) {
    if (isSaving || event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectField(field.uuid);
    setInteraction({
      area,
      mode,
      startArea: area,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function updateInteraction(
    event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>,
  ) {
    if (!interaction) {
      return;
    }

    const parent = event.currentTarget.closest("[data-page-layer]");

    if (!parent) {
      return;
    }

    const rect = parent.getBoundingClientRect();
    const dx = (event.clientX - interaction.startX) / rect.width;
    const dy = (event.clientY - interaction.startY) / rect.height;

    if (interaction.mode === "move") {
      setInteraction({
        ...interaction,
        area: normalizeArea(
          {
            ...interaction.startArea,
            x: interaction.startArea.x + dx,
            y: interaction.startArea.y + dy,
          },
          field.type,
        ),
      });
      return;
    }

    setInteraction({
      ...interaction,
      area: normalizeArea(
        {
          ...interaction.startArea,
          h: interaction.startArea.h + dy,
          w: interaction.startArea.w + dx,
        },
        field.type,
      ),
    });
  }

  function finishInteraction() {
    if (!interaction) {
      return;
    }

    const nextArea = interaction.area;

    setInteraction(null);
    void onUpdateFieldArea(field.uuid, areaIndex, nextArea);
  }

  function saveLabelName(value: string) {
    const nextName = value.trim() || title;

    setIsRenamingLabel(false);

    if (nextName !== field.name) {
      void onUpdateField(field.uuid, { name: nextName });
    }
  }

  function changeFieldType(nextType: EditorFieldType) {
    if (nextType === field.type) {
      return;
    }

    void onUpdateField(field.uuid, buildFieldTypeUpdate(field, nextType));
  }

  function changeFieldSubmitter(submitterUuid: string) {
    if (submitterUuid === field.submitter_uuid) {
      return;
    }

    void onUpdateField(field.uuid, { submitter_uuid: submitterUuid });
  }

  return (
    <div
      aria-label={`${title} field`}
      className={cn(
        "group/field absolute cursor-grab rounded border outline-none shadow-[0_12px_30px_-24px_rgb(127_29_29)] ring-offset-1 transition-[border-color,box-shadow,background-color] [container-type:size] active:cursor-grabbing",
        isSelected || isMultiSelected
          ? "ring-2 ring-red-500/25"
          : "hover:shadow-[0_16px_32px_-26px_rgb(15_23_42)]",
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelectField(field.uuid, event.metaKey || event.ctrlKey);
      }}
      onKeyDown={(event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "c"
        ) {
          event.preventDefault();
          onCopySelectedFields(field.uuid);
          return;
        }

        if (
          (event.metaKey || event.ctrlKey) &&
          event.key.toLowerCase() === "v"
        ) {
          event.preventDefault();
          void onPasteCopiedFields();
          return;
        }

        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          void onDeleteSelectedFields(field.uuid);
          return;
        }

        if (
          event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight"
        ) {
          event.preventDefault();
          const step = event.shiftKey ? 0.02 : 0.005;
          void onNudgeSelectedFields(
            field.uuid,
            event.key === "ArrowLeft"
              ? -step
              : event.key === "ArrowRight"
                ? step
                : 0,
            event.key === "ArrowUp"
              ? -step
              : event.key === "ArrowDown"
                ? step
                : 0,
          );
        }
      }}
      onPointerCancel={() => setInteraction(null)}
      onPointerDown={(event) => startInteraction("move", event)}
      onPointerMove={updateInteraction}
      onPointerUp={finishInteraction}
      role="button"
      style={{
        ...areaToStyle(displayArea),
        backgroundColor: `${roleColor}1f`,
        borderColor: roleColor,
      }}
      tabIndex={0}
    >
      {shouldShowLabel ? (
        <div
          className="absolute -top-7 left-0 flex w-max max-w-72 items-center gap-1 rounded-t-md border border-b-0 bg-white/95 px-2 py-1 text-xs font-medium text-[var(--auth-primary)] shadow-sm backdrop-blur dark:bg-card/95"
          style={{ borderColor: roleColor }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Change ${title} role`}
                className="flex size-4 shrink-0 items-center justify-center rounded-full"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectField(field.uuid);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: roleColor }}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-52"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <DropdownMenuLabel>Assigned role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {submitters.map((submitter, index) => (
                  <DropdownMenuItem
                    className="gap-2"
                    key={submitter.uuid}
                    onClick={(event) => {
                      event.stopPropagation();
                      void changeFieldSubmitter(submitter.uuid);
                    }}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          submitterColors[index % submitterColors.length],
                      }}
                    />
                    <span className="flex-1 truncate">
                      {submitter.name || getPartyName(index)}
                    </span>
                    {field.submitter_uuid === submitter.uuid ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Current
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Change ${title} field type`}
                className="flex size-5 shrink-0 items-center justify-center rounded-sm text-[var(--auth-primary)] hover:bg-red-50"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectField(field.uuid);
                }}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <Icon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-52"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <DropdownMenuLabel>Field type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {fieldTypes.map((fieldType) => {
                const TypeOptionIcon = fieldType.icon;

                return (
                  <DropdownMenuItem
                    className="gap-2"
                    disabled={fieldType.locked || isSaving}
                    key={fieldType.type}
                    onClick={(event) => {
                      event.stopPropagation();
                      changeFieldType(fieldType.type);
                    }}
                  >
                    <TypeOptionIcon className="size-4" />
                    <span className="flex-1">{fieldType.label}</span>
                    {field.type === fieldType.type ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Current
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {isRenamingLabel ? (
            <input
              aria-label={`${title} name`}
              className="h-5 max-w-40 bg-transparent px-0 text-xs font-medium text-[var(--auth-primary)] outline-none ring-0 focus:outline-none focus:ring-0"
              onBlur={(event) => saveLabelName(event.target.value)}
              onChange={(event) => setLabelDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();

                if (event.key === "Enter") {
                  saveLabelName(event.currentTarget.value);
                }

                if (event.key === "Escape") {
                  setIsRenamingLabel(false);
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              ref={labelInputRef}
              style={{
                width: `${getAutosizeInputCh(labelDraft || title)}ch`,
              }}
              value={labelDraft}
            />
          ) : (
            <button
              className="min-w-0 flex-1 truncate rounded-sm text-left hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                setLabelDraft(title);
                setIsRenamingLabel(true);
                onSelectField(field.uuid);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
            >
              {title}
            </button>
          )}
          {isSelected ? (
            <>
              <Checkbox
                aria-label={
                  field.required !== false
                    ? `Mark ${title} optional`
                    : `Mark ${title} required`
                }
                checked={field.required !== false}
                className="ml-0.5"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onCheckedChange={(checked) => {
                  void onUpdateField(field.uuid, {
                    required: checked === true,
                  });
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                title={field.required !== false ? "Required" : "Optional"}
              />
              <button
                aria-label={`Delete ${title}`}
                className="ml-0.5 rounded-full p-0.5 text-[var(--auth-label)] hover:bg-red-50 hover:text-red-600"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onDeleteField(field.uuid);
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                type="button"
              >
                <Trash2Icon className="size-3" />
              </button>
            </>
          ) : null}
          {conditionCount > 0 ? (
            <span className="ml-0.5 rounded bg-[var(--auth-primary)] px-1 text-[10px] font-bold text-[var(--auth-primary-foreground)]">
              {conditionCount}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex h-full w-full items-center justify-center overflow-hidden p-0 text-[var(--auth-primary)]">
        {isSelected && isTextEditableField(field.type) ? (
          <input
            aria-label={`${title} value`}
            className="h-full w-full bg-transparent px-[1cqw] py-0 text-left font-medium leading-none text-[var(--auth-primary)] outline-none ring-0 placeholder:text-[var(--auth-label)] [font-size:clamp(2px,45cqh,18px)] focus:outline-none focus:ring-0"
            onBlur={(event) =>
              void onUpdateField(field.uuid, {
                default_value: event.target.value,
              })
            }
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder={typeMeta?.label ?? "Text"}
            ref={inputRef}
            type="text"
            defaultValue={defaultValue}
          />
        ) : isSelected && field.type === "checkbox" ? (
          <button
            aria-pressed={checkedValue}
            className={cn(
              "flex size-7 items-center justify-center rounded border-2 bg-white text-red-600 shadow-sm transition-colors",
              checkedValue
                ? "border-red-500 bg-red-50"
                : "border-red-300 hover:border-red-500",
            )}
            onClick={(event) => {
              event.stopPropagation();
              void onUpdateField(field.uuid, { default_value: !checkedValue });
            }}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            {checkedValue ? <CheckSquareIcon className="size-5" /> : null}
          </button>
        ) : isTextEditableField(field.type) && hasDisplayValue ? (
          <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap px-[1cqw] text-left font-medium leading-none text-[var(--auth-primary)] [font-size:clamp(2px,45cqh,18px)]">
            {defaultValue}
          </span>
        ) : field.type === "checkbox" && checkedValue ? (
          <CheckSquareIcon className="size-7 opacity-70" />
        ) : (
          <Icon className="size-8 opacity-45" />
        )}
      </div>

      {isSelected ? (
        <button
          aria-label={`Resize ${title}`}
          className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize rounded-full border border-red-500 bg-white shadow-sm ring-2 ring-white transition-transform hover:scale-125"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => startInteraction("resize", event)}
          onPointerMove={updateInteraction}
          onPointerUp={finishInteraction}
          type="button"
        />
      ) : null}
    </div>
  );
}
