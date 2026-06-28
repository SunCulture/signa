"use client";

import type { ComponentType } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { useState } from "react";
import {
  GripVerticalIcon,
  InfoIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ScanSearchIcon,
  Trash2Icon,
  TypeIcon,
  UserRoundPlusIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  buildDefaultFieldName,
  buildFieldTypeUpdate,
  fieldTypes,
  getFieldConditions,
  getFieldTypeDefinition,
  getPartyName,
  getSubmitterColor,
  getSubmitterName,
  isChoiceField,
  readFieldDragPayload,
  writeFieldDragPayload,
  submitterColors,
  type EditorFieldType,
  type SubmitterRemovalMode,
  type TemplateCustomField,
  type TemplateEditorField,
  type TemplateFieldArea,
  type TemplateSubmitter,
} from "../../_lib/template-editor-model";
import { FieldOptionsEditor } from "./field-options-editor";
import { FieldSettingsMenu } from "./field-settings-menu";
import {
  FieldAdvancedSettingsModal,
  FieldConditionsModal,
  FieldDescriptionModal,
} from "../modals/field-modals";

export function TemplateFieldsPanel({
  activeFieldType,
  fields,
  customFields,
  isSavingFields,
  onAddSubmitter,
  onAddFieldWithoutDrawing,
  onCancelFieldPlacement,
  onCustomFieldSelect,
  onCopyFieldToAllPages,
  onDeleteField,
  onFieldTypeSelect,
  onGoToFieldArea,
  onGoToFieldPage,
  onMoveField,
  onMoveFieldToIndex,
  onRemoveSubmitter,
  onRenameSubmitter,
  onSelectSubmitter,
  onSaveCustomField,
  onSelectField,
  onStartDrawNewArea,
  onUpdateField,
  selectedFieldUuid,
  selectedSubmitterUuid,
  submitters,
}: {
  activeFieldType: EditorFieldType | null;
  customFields: TemplateCustomField[];
  fields: TemplateEditorField[];
  isSavingFields: boolean;
  onAddSubmitter: () => Promise<void>;
  onAddFieldWithoutDrawing: () => Promise<void>;
  onCancelFieldPlacement: () => void;
  onCustomFieldSelect: (field: TemplateCustomField) => Promise<void>;
  onCopyFieldToAllPages: (field: TemplateEditorField) => Promise<void>;
  onDeleteField: (fieldUuid: string) => Promise<void>;
  onFieldTypeSelect: (type: EditorFieldType) => void;
  onGoToFieldArea: (
    field: TemplateEditorField,
    area: TemplateFieldArea,
  ) => void;
  onGoToFieldPage: (field: TemplateEditorField) => void;
  onMoveField: (fieldUuid: string, direction: -1 | 1) => Promise<void>;
  onMoveFieldToIndex: (fieldUuid: string, targetIndex: number) => Promise<void>;
  onRemoveSubmitter: (
    submitterUuid: string,
    mode?: SubmitterRemovalMode,
  ) => Promise<void>;
  onRenameSubmitter: (submitterUuid: string, name: string) => Promise<void>;
  onSelectSubmitter: (submitterUuid: string) => void;
  onSaveCustomField: (field: TemplateEditorField) => Promise<void>;
  onSelectField: (fieldUuid: string) => void;
  onStartDrawNewArea: (field: TemplateEditorField) => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  selectedFieldUuid: string | null;
  selectedSubmitterUuid: string | null;
  submitters: TemplateSubmitter[];
}) {
  const activeField = activeFieldType
    ? getFieldTypeDefinition(activeFieldType)
    : null;
  const ActiveIcon = activeField?.icon ?? TypeIcon;
  const selectedSubmitter =
    submitters.find((submitter) => submitter.uuid === selectedSubmitterUuid) ??
    submitters.at(0) ??
    null;
  const visibleFields = selectedSubmitter
    ? fields.filter((field) => field.submitter_uuid === selectedSubmitter.uuid)
    : fields;
  const visibleFieldIndexes = new Map(
    fields.map((field, index) => [field.uuid, index]),
  );

  return (
    <TooltipProvider>
      <aside className="overflow-y-auto border-l border-[var(--auth-input-border)] bg-card p-3">
        <section className="rounded-md border border-[var(--auth-input-border)]">
          <RoleSelector
            fields={fields}
            isSaving={isSavingFields}
            onAddSubmitter={onAddSubmitter}
            onRemoveSubmitter={onRemoveSubmitter}
            onRenameSubmitter={onRenameSubmitter}
            onSelectSubmitter={onSelectSubmitter}
            selectedSubmitterUuid={selectedSubmitter?.uuid ?? null}
            submitters={submitters}
          />

          {visibleFields.length > 0 ? (
            <div className="border-b border-[var(--auth-input-border)] bg-[color-mix(in_srgb,var(--auth-muted),transparent_35%)] p-1">
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
                {visibleFields.map((field) => (
                  <SidebarFieldItem
                    field={field}
                    fields={fields}
                    index={visibleFieldIndexes.get(field.uuid) ?? 0}
                    isSelected={field.uuid === selectedFieldUuid}
                    key={field.uuid}
                    onCopyToAllPages={onCopyFieldToAllPages}
                    onDelete={() => onDeleteField(field.uuid)}
                    onGoToPage={() => onGoToFieldPage(field)}
                    onGoToArea={(area) => onGoToFieldArea(field, area)}
                    onMoveDown={() => onMoveField(field.uuid, 1)}
                    onMoveFieldToIndex={onMoveFieldToIndex}
                    onMoveUp={() => onMoveField(field.uuid, -1)}
                    onSaveCustomField={onSaveCustomField}
                    onSelect={() => onSelectField(field.uuid)}
                    onStartDrawNewArea={() => onStartDrawNewArea(field)}
                    onUpdateField={onUpdateField}
                    submitters={submitters}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <CustomFieldsSection
            customFields={customFields}
            isSavingFields={isSavingFields}
            onCustomFieldSelect={onCustomFieldSelect}
          />

          <div className="grid grid-cols-3">
            {fieldTypes.map((field) => (
              <FieldTypeButton
                isActive={activeFieldType === field.type}
                isSavingFields={isSavingFields}
                key={field.type}
                onSelect={onFieldTypeSelect}
                {...field}
              />
            ))}
          </div>

          {activeField ? (
            <div className="m-2 overflow-hidden rounded-md border border-[var(--auth-input-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--auth-muted),white_35%),white)] p-4 text-center shadow-sm dark:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--auth-muted),black_10%),var(--card))]">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)] shadow-[0_12px_32px_-18px_var(--auth-primary)]">
                <ActiveIcon className="size-6" />
              </div>
              <p className="text-sm font-semibold text-[var(--auth-primary)]">
                Draw a {activeField.label.toLowerCase()} field on the document
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--auth-label)]">
                Click once to place a standard field, or drag to set the exact
                size.
              </p>
              <div className="mt-4 flex flex-col items-center gap-3">
                <Button
                  className="h-11 rounded-full bg-[var(--auth-primary)] px-7 font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
                  onClick={onCancelFieldPlacement}
                  type="button"
                >
                  CANCEL
                </Button>
                <button
                  className="text-sm font-medium text-[var(--auth-primary)] underline-offset-4 hover:underline"
                  disabled={isSavingFields}
                  onClick={() => void onAddFieldWithoutDrawing()}
                  type="button"
                >
                  Or add field without drawing
                </button>
              </div>
            </div>
          ) : (
            <div className="m-2 rounded-md border border-dashed border-[var(--auth-input-border)] p-3 text-xs leading-5 text-[var(--auth-label)]">
              <ul className="list-disc pl-4">
                <li>Draw a text field on the page with a mouse</li>
                <li>Drag &amp; drop any other field type on the page</li>
                <li>Click on the field type above to start drawing it</li>
              </ul>
            </div>
          )}
        </section>

        <Button
          className="mt-3 h-12 w-full rounded-full bg-[var(--auth-muted)] font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-primary)] hover:text-[var(--auth-primary-foreground)]"
          type="button"
          variant="ghost"
        >
          <ScanSearchIcon data-icon="inline-start" />
          AUTODETECT FIELDS
        </Button>
      </aside>
    </TooltipProvider>
  );
}

function CustomFieldsSection({
  customFields,
  isSavingFields,
  onCustomFieldSelect,
}: {
  customFields: TemplateCustomField[];
  isSavingFields: boolean;
  onCustomFieldSelect: (field: TemplateCustomField) => Promise<void>;
}) {
  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-[var(--auth-input-border)] bg-card p-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--auth-label)]">
          Custom fields
        </p>
        <span className="rounded-full bg-[var(--auth-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--auth-primary)]">
          {customFields.length}
        </span>
      </div>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {customFields.map((field, index) => {
          const typeMeta = getFieldTypeDefinition(field.type);
          const Icon = typeMeta?.icon ?? TypeIcon;
          const title =
            field.name || buildDefaultFieldName(field.type, index);

          return (
            <button
              className="group/custom flex h-9 w-full cursor-grab items-center gap-2 rounded-md border border-[var(--auth-input-border)] bg-[var(--auth-background)] px-2 text-left text-sm transition-colors hover:border-[var(--auth-primary)] hover:bg-[var(--auth-muted)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingFields}
              draggable={!isSavingFields}
              key={field.uuid}
              onClick={() => void onCustomFieldSelect(field)}
              onDragStart={(event) => {
                writeFieldDragPayload(event.dataTransfer, {
                  customFieldUuid: field.uuid,
                  kind: "custom",
                  type: field.type,
                });
              }}
              type="button"
            >
              <Icon className="size-4 shrink-0 text-[var(--auth-primary)]" />
              <span className="min-w-0 flex-1 truncate font-medium text-[var(--auth-primary)]">
                {title}
              </span>
              <GripVerticalIcon className="size-4 shrink-0 text-[var(--auth-label)] opacity-70 transition-opacity group-hover/custom:opacity-100" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RoleSelector({
  fields,
  isSaving,
  onAddSubmitter,
  onRemoveSubmitter,
  onRenameSubmitter,
  onSelectSubmitter,
  selectedSubmitterUuid,
  submitters,
}: {
  fields: TemplateEditorField[];
  isSaving: boolean;
  onAddSubmitter: () => Promise<void>;
  onRemoveSubmitter: (
    submitterUuid: string,
    mode?: SubmitterRemovalMode,
  ) => Promise<void>;
  onRenameSubmitter: (submitterUuid: string, name: string) => Promise<void>;
  onSelectSubmitter: (submitterUuid: string) => void;
  selectedSubmitterUuid: string | null;
  submitters: TemplateSubmitter[];
}) {
  const selectedIndex = Math.max(
    0,
    submitters.findIndex(
      (submitter) => submitter.uuid === selectedSubmitterUuid,
    ),
  );
  const selectedSubmitter = submitters[selectedIndex] ?? submitters[0];
  const selectedRoleName =
    selectedSubmitter?.name || getPartyName(selectedIndex);
  const selectedColor = submitterColors[selectedIndex % submitterColors.length];

  if (!selectedSubmitter) {
    return null;
  }

  return (
    <div className="border-b border-[var(--auth-input-border)] p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="group flex h-12 w-full items-center gap-3 rounded-lg border border-[var(--auth-input-border)] bg-card px-3 text-left transition-colors hover:border-[var(--auth-primary)] hover:bg-[var(--auth-muted)]"
            disabled={isSaving}
            type="button"
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--auth-primary)]">
              {selectedRoleName}
            </span>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-transparent text-[var(--auth-primary)] transition-colors group-hover:border-[var(--auth-primary)]">
              <PlusIcon className="size-4" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[304px] p-2">
          <DropdownMenuLabel className="px-2 text-xs uppercase tracking-wide text-[var(--auth-label)]">
            Roles
          </DropdownMenuLabel>
          <DropdownMenuGroup className="max-h-[calc(100vh-180px)] overflow-y-auto">
            {submitters.map((submitter, index) => {
              const roleName = submitter.name || getPartyName(index);
              const assignedFieldCount = fields.filter(
                (field) => field.submitter_uuid === submitter.uuid,
              ).length;
              const isSelected = submitter.uuid === selectedSubmitter.uuid;

              return (
                <div
                  className={cn(
                    "group/role flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5",
                    isSelected ? "bg-[var(--auth-muted)]" : "hover:bg-muted",
                  )}
                  key={submitter.uuid}
                  onClick={() => onSelectSubmitter(submitter.uuid)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectSubmitter(submitter.uuid);
                    }
                  }}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        submitterColors[index % submitterColors.length],
                    }}
                  />
                  <input
                    aria-label={`Role ${index + 1} name`}
                    className="min-w-0 flex-1 cursor-text bg-transparent text-sm font-medium outline-none"
                    defaultValue={roleName}
                    disabled={isSaving}
                    onBlur={(event) =>
                      void onRenameSubmitter(submitter.uuid, event.target.value)
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectSubmitter(submitter.uuid);
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();

                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  {submitters.length > 1 ? (
                    assignedFieldCount > 0 ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            aria-label={`Remove ${roleName}`}
                            className="invisible rounded-full p-1 text-[var(--auth-label)] hover:bg-red-50 hover:text-red-600 group-hover/role:visible"
                            disabled={isSaving}
                            type="button"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md">
                          <AlertDialogTitle>
                            Remove {roleName}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This role has {assignedFieldCount} assigned{" "}
                            {assignedFieldCount === 1 ? "field" : "fields"}.
                            Choose whether to delete those fields or keep them
                            by assigning them to the next available role.
                          </AlertDialogDescription>
                          <AlertDialogFooter className="sm:grid sm:grid-cols-[1fr_1fr] sm:gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="outline"
                              onClick={() =>
                                void onRemoveSubmitter(
                                  submitter.uuid,
                                  "keep_fields",
                                )
                              }
                            >
                              Delete Role, Keep Fields
                            </AlertDialogAction>
                            <AlertDialogAction
                              className="sm:col-span-2"
                              variant="destructive"
                              onClick={() =>
                                void onRemoveSubmitter(
                                  submitter.uuid,
                                  "remove_fields",
                                )
                              }
                            >
                              Delete Role And Fields
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <button
                        aria-label={`Remove ${roleName}`}
                        className="invisible rounded-full p-1 text-[var(--auth-label)] hover:bg-red-50 hover:text-red-600 group-hover/role:visible"
                        disabled={isSaving}
                        onClick={() => void onRemoveSubmitter(submitter.uuid)}
                        type="button"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    )
                  ) : null}
                </div>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isSaving}
            onClick={() => void onAddSubmitter()}
          >
            <UserRoundPlusIcon className="size-4" />
            Add {getPartyName(submitters.length)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SidebarFieldItem({
  field,
  fields,
  index,
  isSelected,
  onCopyToAllPages,
  onDelete,
  onGoToArea,
  onGoToPage,
  onMoveDown,
  onMoveFieldToIndex,
  onMoveUp,
  onSaveCustomField,
  onSelect,
  onStartDrawNewArea,
  onUpdateField,
  submitters,
}: {
  field: TemplateEditorField;
  fields: TemplateEditorField[];
  index: number;
  isSelected: boolean;
  onCopyToAllPages: (field: TemplateEditorField) => Promise<void>;
  onDelete: () => Promise<void>;
  onGoToArea: (area: TemplateFieldArea) => void;
  onGoToPage: () => void;
  onMoveDown: () => Promise<void>;
  onMoveFieldToIndex: (fieldUuid: string, targetIndex: number) => Promise<void>;
  onMoveUp: () => Promise<void>;
  onSaveCustomField: (field: TemplateEditorField) => Promise<void>;
  onSelect: () => void;
  onStartDrawNewArea: () => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  submitters: TemplateSubmitter[];
}) {
  const typeMeta = getFieldTypeDefinition(field.type);
  const Icon = typeMeta?.icon ?? TypeIcon;
  const title = field.name || buildDefaultFieldName(field.type, index);
  const roleColor = getSubmitterColor(submitters, field.submitter_uuid);
  const shouldShowOptions = isSelected && isChoiceField(field.type);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConditionsOpen, setIsConditionsOpen] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<"after" | "before" | null>(
    null,
  );

  function saveName(name: string) {
    const nextName = name.trim() || buildDefaultFieldName(field.type, index);

    setIsRenaming(false);
    if (nextName !== field.name) {
      void onUpdateField(field.uuid, { name: nextName });
    }
  }

  function updateDropPosition(event: ReactDragEvent<HTMLDivElement>) {
    const payload = readFieldDragPayload(event.dataTransfer);

    if (payload?.kind !== "existing" || payload.fieldUuid === field.uuid) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const nextPosition =
      event.clientY - rect.top > rect.height / 2 ? "after" : "before";

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropPosition(nextPosition);
  }

  function dropField(event: ReactDragEvent<HTMLDivElement>) {
    const payload = readFieldDragPayload(event.dataTransfer);

    if (payload?.kind !== "existing" || payload.fieldUuid === field.uuid) {
      setDropPosition(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void onMoveFieldToIndex(
      payload.fieldUuid,
      index + (dropPosition === "after" ? 1 : 0),
    );
    setDropPosition(null);
  }

  return (
    <>
      <div
        aria-pressed={isSelected}
        className={cn(
          "group/field w-full rounded border text-left text-sm transition-colors",
          isSelected
            ? "border-red-300 bg-red-50 text-[var(--auth-primary)] shadow-sm dark:bg-red-950/25"
            : "border-[var(--auth-input-border)] bg-card hover:border-red-200 hover:bg-[var(--auth-muted)]",
          dropPosition === "before" &&
            "shadow-[0_-3px_0_0_var(--auth-primary)]",
          dropPosition === "after" &&
            "shadow-[0_3px_0_0_var(--auth-primary)]",
        )}
        draggable
        onDragStart={(event) => {
          writeFieldDragPayload(event.dataTransfer, {
            fieldUuid: field.uuid,
            kind: "existing",
          });
        }}
        onDragLeave={() => setDropPosition(null)}
        onDragOver={updateDropPosition}
        onDrop={dropField}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex h-8 w-full items-center gap-1 px-1.5">
          <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-[var(--auth-label)] active:cursor-grabbing" />
          <span
            aria-label={`Assigned to ${getSubmitterName(submitters, field.submitter_uuid)}`}
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: roleColor }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Change type for ${title}`}
                className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-background"
                draggable={false}
                onClick={(event) => event.stopPropagation()}
                type="button"
              >
                <Icon className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Change type</DropdownMenuLabel>
              <DropdownMenuGroup>
                {fieldTypes.map((fieldType) => {
                  const TypeIconComponent = fieldType.icon;

                  return (
                    <DropdownMenuItem
                      disabled={fieldType.locked}
                      key={fieldType.type}
                      onClick={(event) => {
                        event.stopPropagation();
                        void onUpdateField(
                          field.uuid,
                          buildFieldTypeUpdate(field, fieldType.type),
                        );
                      }}
                    >
                      <TypeIconComponent className="size-4" />
                      {fieldType.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {isRenaming ? (
            <input
              aria-label={`Rename ${title}`}
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              defaultValue={title}
              draggable={false}
              onBlur={(event) => saveName(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  setIsRenaming(false);
                }
              }}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate">{title}</span>
          )}
          <button
            aria-label={`Rename ${title}`}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded text-[var(--auth-label)] hover:bg-background hover:text-[var(--auth-primary)]",
              shouldShowOptions ? "" : "invisible group-hover/field:visible",
            )}
            draggable={false}
            onClick={(event) => {
              event.stopPropagation();
              setIsRenaming(true);
            }}
            type="button"
          >
            <PencilIcon className="size-3.5" />
          </button>
          {field.required !== false ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  aria-label={`${title} is required`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-red-500"
                >
                  <InfoIcon className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Required</TooltipContent>
            </Tooltip>
          ) : null}
          {getFieldConditions(field).length > 0 ? (
            <span className="rounded-full bg-[var(--auth-primary)] px-1.5 text-[10px] font-semibold text-[var(--auth-primary-foreground)]">
              {getFieldConditions(field).length}
            </span>
          ) : null}
          <FieldSettingsMenu
            field={field}
            fields={fields}
            index={index}
            onCopyToAllPages={onCopyToAllPages}
            onGoToPage={onGoToPage}
            onMoveDown={onMoveDown}
            onMoveUp={onMoveUp}
            onOpenConditions={() => setIsConditionsOpen(true)}
            onOpenDescription={() => setIsDescriptionOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSaveCustomField={onSaveCustomField}
            onStartDrawNewArea={onStartDrawNewArea}
            onUpdateField={onUpdateField}
            title={title}
          />
          <button
            aria-label={`Delete ${title}`}
            className="invisible flex size-6 shrink-0 items-center justify-center rounded text-[var(--auth-label)] hover:bg-red-50 hover:text-red-600 group-hover/field:visible"
            draggable={false}
            onClick={(event) => {
              event.stopPropagation();
              void onDelete();
            }}
            type="button"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
        {shouldShowOptions ? (
          <FieldOptionsEditor
            field={field}
            onSelect={onSelect}
            onStartDrawNewArea={onStartDrawNewArea}
            onUpdateField={(patch) => onUpdateField(field.uuid, patch)}
          />
        ) : null}
      </div>
      {isDescriptionOpen ? (
        <FieldDescriptionModal
          field={field}
          key={`${field.uuid}-description-modal`}
          onOpenChange={setIsDescriptionOpen}
          onSave={(patch) => onUpdateField(field.uuid, patch)}
          open={isDescriptionOpen}
          title={title}
        />
      ) : null}
      {isSettingsOpen ? (
        <FieldAdvancedSettingsModal
          field={field}
          onGoToArea={onGoToArea}
          onOpenChange={setIsSettingsOpen}
          onSave={(patch) => onUpdateField(field.uuid, patch)}
          title={title}
        />
      ) : null}
      {isConditionsOpen ? (
        <FieldConditionsModal
          field={field}
          fields={fields}
          onOpenChange={setIsConditionsOpen}
          onSave={(patch) => onUpdateField(field.uuid, patch)}
          title={title}
        />
      ) : null}
    </>
  );
}

export function FieldTypeButton({
  icon: Icon,
  isActive,
  isSavingFields,
  label,
  locked,
  onSelect,
  type,
}: {
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  isSavingFields: boolean;
  label: string;
  locked?: boolean;
  onSelect: (type: EditorFieldType) => void;
  type: EditorFieldType;
}) {
  return (
    <button
      aria-pressed={isActive}
      className={cn(
        "relative flex min-h-16 flex-col items-center justify-center gap-1 border-b border-r border-dashed border-[var(--auth-input-border)] p-2 text-xs transition-colors hover:bg-[var(--auth-muted)] disabled:cursor-not-allowed disabled:text-muted-foreground",
        isActive &&
          "bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary)]",
      )}
      disabled={locked || isSavingFields}
      draggable={!locked && !isSavingFields}
      onDragStart={(event) => {
        writeFieldDragPayload(event.dataTransfer, { kind: "new", type });
      }}
      onClick={() => onSelect(type)}
      type="button"
    >
      <GripVerticalIcon className="absolute left-1 top-1/2 size-4 -translate-y-1/2 cursor-grab text-[var(--auth-label)] active:cursor-grabbing" />
      {locked ? (
        <LockIcon className="absolute bottom-2 left-2 size-3 text-[var(--auth-label)]" />
      ) : null}
      <Icon
        className={cn(
          "size-5",
          isActive
            ? "text-[var(--auth-primary-foreground)]"
            : "text-[var(--auth-primary)]",
        )}
      />
      <span>{label}</span>
    </button>
  );
}
