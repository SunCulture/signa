"use client";

import { useEffect, useRef } from "react";
import type { TemplateDocument, TemplateResponse } from "@/lib/api/templates";
import { DocumentPageImage } from "./document-page-image";
import {
  getDocumentDisplayName,
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
  onAddSubmitter,
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
  onAddSubmitter: (fieldUuid?: string) => Promise<void>;
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
              onAddSubmitter={onAddSubmitter}
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
  onAddSubmitter,
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
  onAddSubmitter: (fieldUuid?: string) => Promise<void>;
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
              onAddSubmitter={onAddSubmitter}
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
