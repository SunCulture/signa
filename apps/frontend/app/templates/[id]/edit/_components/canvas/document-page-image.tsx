"use client";

import type {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useRef, useState } from "react";
import type { TemplateDocumentPreviewImage } from "@/lib/api/templates";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FieldAreaOverlay } from "./field-area-overlay";
import {
  areaToStyle,
  centerDefaultArea,
  clamp01,
  getPreviewDimension,
  hasFieldDragPayload,
  normalizeArea,
  readFieldDragPayload,
  type DrawDraft,
  type EditorFieldType,
  type FieldDragPayload,
  type TemplateEditorField,
  type TemplateFieldArea,
  type TemplateSubmitter,
} from "../../_lib/template-editor-model";

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
  const pageAspectRatio = width / height;
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
            pageAspectRatio,
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
        pageAspectRatio,
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
      <TooltipProvider>
        <div className="absolute inset-0" data-page-layer>
          {pageFields.map(({ area, areaIndex, field }) => (
            <FieldAreaOverlay
              area={area}
              areaIndex={areaIndex}
              field={field}
              fields={fields}
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
      </TooltipProvider>
    </div>
  );
}
