"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Trash2Icon, TypeIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { handleFieldAreaKeyboard } from "./field-area-keyboard";
import { FieldAreaResizeHandle } from "./field-area-resize-handle";
import { FieldAreaValue } from "./field-area-value";
import {
  areaToStyle,
  buildDefaultFieldName,
  buildFieldTypeUpdate,
  fieldTypes,
  getAutosizeInputCh,
  getFieldConditions,
  getFieldStringValue,
  getFieldTypeDefinition,
  getPartyName,
  getSubmitterColor,
  isTextEditableField,
  normalizeArea,
  submitterColors,
  type EditorFieldType,
  type TemplateEditorField,
  type TemplateFieldArea,
  type TemplateSubmitter,
} from "../../_lib/template-editor-model";

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
        handleFieldAreaKeyboard({
          event,
          field,
          onCopySelectedFields,
          onDeleteSelectedFields,
          onNudgeSelectedFields,
          onPasteCopiedFields,
        });
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
        <FieldAreaValue
          checkedValue={checkedValue}
          defaultValue={defaultValue}
          field={field}
          hasDisplayValue={hasDisplayValue}
          inputRef={inputRef}
          isSelected={isSelected}
          onUpdateField={onUpdateField}
          title={title}
        />
      </div>

      {isSelected ? (
        <FieldAreaResizeHandle
          finishInteraction={finishInteraction}
          startResize={(event) => startInteraction("resize", event)}
          title={title}
          updateInteraction={updateInteraction}
        />
      ) : null}
    </div>
  );
}
