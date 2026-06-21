"use client";

import type { RefObject } from "react";
import { CheckSquareIcon, TypeIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getFieldTypeDefinition,
  isTextEditableField,
  type TemplateEditorField,
} from "../../_lib/template-editor-model";

export function FieldAreaValue({
  checkedValue,
  defaultValue,
  field,
  hasDisplayValue,
  inputRef,
  isSelected,
  onUpdateField,
  title,
}: {
  checkedValue: boolean;
  defaultValue: string;
  field: TemplateEditorField;
  hasDisplayValue: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  isSelected: boolean;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
  title: string;
}) {
  const typeMeta = getFieldTypeDefinition(field.type);
  const Icon = typeMeta?.icon ?? TypeIcon;

  if (isSelected && isTextEditableField(field.type)) {
    return (
      <input
        aria-label={`${title} value`}
        className="h-full w-full bg-transparent px-[1cqw] py-0 text-left font-medium leading-none text-[var(--auth-primary)] outline-none ring-0 placeholder:text-[var(--auth-label)] [font-size:clamp(2px,45cqh,18px)] focus:outline-none focus:ring-0"
        defaultValue={defaultValue}
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
      />
    );
  }

  if (isSelected && field.type === "checkbox") {
    return (
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
    );
  }

  if (isTextEditableField(field.type) && hasDisplayValue) {
    return (
      <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap px-[1cqw] text-left font-medium leading-none text-[var(--auth-primary)] [font-size:clamp(2px,45cqh,18px)]">
        {defaultValue}
      </span>
    );
  }

  if (field.type === "checkbox" && checkedValue) {
    return <CheckSquareIcon className="size-7 opacity-70" />;
  }

  return <Icon className="h-full w-full max-h-[4.4cqmin] opacity-50" />;
}
