"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  FileIcon,
  FilePlus2Icon,
  GitBranchIcon,
  InfoIcon,
  MoreVerticalIcon,
  PenLineIcon,
  SaveIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { TemplateEditorField } from "../../_lib/template-editor-model";

export function FieldSettingsMenu({
  field,
  fields,
  index,
  onCopyToAllPages,
  onGoToPage,
  onMoveDown,
  onMoveUp,
  onOpenConditions,
  onOpenDescription,
  onOpenSettings,
  onStartDrawNewArea,
  onUpdateField,
  title,
}: {
  field: TemplateEditorField;
  fields: TemplateEditorField[];
  index: number;
  onCopyToAllPages: (field: TemplateEditorField) => Promise<void>;
  onGoToPage: () => void;
  onMoveDown: () => Promise<void>;
  onMoveUp: () => Promise<void>;
  onOpenConditions: () => void;
  onOpenDescription: () => void;
  onOpenSettings: () => void;
  onStartDrawNewArea: () => void;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  title: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Open settings for ${title}`}
          className="invisible flex size-6 shrink-0 items-center justify-center rounded text-[var(--auth-label)] hover:bg-background hover:text-[var(--auth-primary)] group-hover/field:visible"
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          type="button"
        >
          <MoreVerticalIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{title}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <MoveFieldMenuItems
            fields={fields}
            index={index}
            onMoveDown={onMoveDown}
            onMoveUp={onMoveUp}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <SlidersHorizontalIcon className="size-4" />
            Format
          </DropdownMenuItem>
          <RequiredFieldMenuItem
            field={field}
            onUpdateField={onUpdateField}
            title={title}
          />
          <DropdownMenuItem onClick={onOpenDescription}>
            <InfoIcon className="size-4" />
            Description
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenConditions}>
            <GitBranchIcon className="size-4" />
            Condition
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onGoToPage}>
            <FileIcon className="size-4" />
            Page
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStartDrawNewArea}>
            <PenLineIcon className="size-4" />
            Draw new area
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void onCopyToAllPages(field)}>
            <FilePlus2Icon className="size-4" />
            Copy to all pages
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            toast.info("Custom fields need the saved-field library model")
          }
        >
          <SaveIcon className="size-4" />
          Save as custom field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RequiredFieldMenuItem({
  field,
  onUpdateField,
  title,
}: {
  field: TemplateEditorField;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  title: string;
}) {
  return (
    <DropdownMenuItem
      className="gap-3"
      onSelect={(event) => event.preventDefault()}
    >
      <span className="min-w-0 flex-1">Required</span>
      <Switch
        aria-label={`Toggle required for ${title}`}
        checked={field.required !== false}
        onCheckedChange={(checked) =>
          void onUpdateField(field.uuid, { required: checked })
        }
        size="sm"
      />
    </DropdownMenuItem>
  );
}

function MoveFieldMenuItems({
  fields,
  index,
  onMoveDown,
  onMoveUp,
}: {
  fields: TemplateEditorField[];
  index: number;
  onMoveDown: () => Promise<void>;
  onMoveUp: () => Promise<void>;
}) {
  return (
    <>
      <DropdownMenuItem
        disabled={index === 0}
        onClick={(event) => {
          event.stopPropagation();
          void onMoveUp();
        }}
      >
        <ArrowUpIcon className="size-4" />
        Move up
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={index === fields.length - 1}
        onClick={(event) => {
          event.stopPropagation();
          void onMoveDown();
        }}
      >
        <ArrowDownIcon className="size-4" />
        Move down
      </DropdownMenuItem>
    </>
  );
}
