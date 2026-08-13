"use client";

import type {
  ClipboardEvent as ReactClipboardEvent,
  DragEvent as ReactDragEvent,
} from "react";
import { ScanSearchIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getFieldOptions,
  writeFieldDragPayload,
  type TemplateEditorField,
  type TemplateFieldOption,
} from "../../_lib/template-editor-model";

export function FieldOptionsEditor({
  field,
  onSelect,
  onStartDrawNewArea,
  onUpdateField,
}: {
  field: TemplateEditorField;
  onSelect: () => void;
  onStartDrawNewArea: () => void;
  onUpdateField: (patch: Partial<TemplateEditorField>) => Promise<void>;
}) {
  const options = getFieldOptions(field);

  function persistOptions(nextOptions: TemplateFieldOption[]) {
    void onUpdateField({ options: nextOptions });
  }

  function addOptionAt(index: number) {
    persistOptions(insertEmptyOption(options, index));
  }

  function removeOption(optionUuid: string) {
    if (options.length <= 1) {
      return;
    }

    void onUpdateField({
      areas: field.areas.filter((area) => area.option_uuid !== optionUuid),
      options: options.filter((option) => option.uuid !== optionUuid),
    });
  }

  function saveOption(optionUuid: string, value: string) {
    persistOptions(updateOptionValue(options, optionUuid, value));
  }

  function saveOptionAndAddAfter(optionUuid: string, value: string) {
    const nextOptions = updateOptionValue(options, optionUuid, value);
    const currentIndex = nextOptions.findIndex(
      (option) => option.uuid === optionUuid,
    );

    persistOptions(insertEmptyOption(nextOptions, currentIndex + 1));
  }

  function pasteOptions(
    event: ReactClipboardEvent<HTMLInputElement>,
    optionUuid: string,
  ) {
    const pastedOptions = parsePastedOptions(event);

    if (pastedOptions.length <= 1) {
      return;
    }

    event.preventDefault();
    persistOptions(insertPastedOptions(options, optionUuid, pastedOptions));
  }

  return (
    <div
      className="mx-2 space-y-1.5 border-t border-[var(--auth-input-border)] pt-2"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {options.map((option, index) => (
        <FieldOptionRow
          field={field}
          index={index}
          key={option.uuid}
          onAddAfter={saveOptionAndAddAfter}
          onPaste={pasteOptions}
          onRemove={removeOption}
          onSave={saveOption}
          onStartDrawNewArea={onStartDrawNewArea}
          option={option}
        />
      ))}
      <button
        className="w-full pb-1 text-center text-sm text-[var(--auth-primary)] hover:underline"
        onClick={() => addOptionAt(options.length)}
        type="button"
      >
        + Add option
      </button>
    </div>
  );
}

function FieldOptionRow({
  field,
  index,
  onAddAfter,
  onPaste,
  onRemove,
  onSave,
  onStartDrawNewArea,
  option,
}: {
  field: TemplateEditorField;
  index: number;
  onAddAfter: (optionUuid: string, value: string) => void;
  onPaste: (
    event: ReactClipboardEvent<HTMLInputElement>,
    optionUuid: string,
  ) => void;
  onRemove: (optionUuid: string) => void;
  onSave: (optionUuid: string, value: string) => void;
  onStartDrawNewArea: () => void;
  option: TemplateFieldOption;
}) {
  const hasOptionArea = field.areas.some(
    (area) => area.option_uuid === option.uuid,
  );
  const canDrawOption =
    ["multiple", "radio"].includes(field.type) && !hasOptionArea;

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3.5 cursor-grab select-none text-sm">
        {index + 1}.
      </span>
      <div className="flex min-w-0 flex-1 items-center">
        <input
          aria-label={`Option ${index + 1}`}
          className={cn(
            "h-6 min-w-0 flex-1 rounded-full border border-[var(--auth-input-border)] bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-[var(--auth-label)] focus:border-red-400 focus-visible:ring-2 focus-visible:ring-ring",
            canDrawOption ? "pr-8" : "",
          )}
          defaultValue={option.value}
          onBlur={(event) => onSave(option.uuid, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.currentTarget.value.trim()) {
              onAddAfter(option.uuid, event.currentTarget.value);
            }
          }}
          onPaste={(event) => onPaste(event, option.uuid)}
          placeholder={`Option ${index + 1}`}
        />
        {canDrawOption ? (
          <DrawOptionAreaButton
            fieldUuid={field.uuid}
            onStartDrawNewArea={onStartDrawNewArea}
            optionUuid={option.uuid}
            optionIndex={index}
          />
        ) : null}
      </div>
      <button
        aria-label={`Remove option ${index + 1}`}
        className="flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--auth-label)] hover:bg-red-50 hover:text-red-600"
        onClick={() => onRemove(option.uuid)}
        type="button"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}

function DrawOptionAreaButton({
  fieldUuid,
  onStartDrawNewArea,
  optionIndex,
  optionUuid,
}: {
  fieldUuid: string;
  onStartDrawNewArea: () => void;
  optionIndex: number;
  optionUuid: string;
}) {
  function handleDragStart(event: ReactDragEvent<HTMLButtonElement>) {
    writeFieldDragPayload(event.dataTransfer, {
      fieldUuid,
      kind: "existing",
      optionUuid,
    });
  }

  return (
    <button
      aria-label={`Draw area for option ${optionIndex + 1}`}
      className="-ml-7 flex size-6 cursor-grab items-center justify-center rounded-full text-[var(--auth-label)] hover:bg-background hover:text-[var(--auth-primary)] active:cursor-grabbing"
      draggable
      onClick={() => {
        onStartDrawNewArea();
        toast.info("Drag this option button onto the page");
      }}
      onDragStart={handleDragStart}
      title="Draw"
      type="button"
    >
      <ScanSearchIcon className="size-3.5" />
    </button>
  );
}

function insertEmptyOption(
  options: TemplateFieldOption[],
  index: number,
): TemplateFieldOption[] {
  return [
    ...options.slice(0, index),
    { uuid: crypto.randomUUID(), value: "" },
    ...options.slice(index),
  ];
}

function updateOptionValue(
  options: TemplateFieldOption[],
  optionUuid: string,
  value: string,
): TemplateFieldOption[] {
  return options.map((option) =>
    option.uuid === optionUuid ? { ...option, value } : option,
  );
}

function parsePastedOptions(
  event: ReactClipboardEvent<HTMLInputElement>,
): string[] {
  return event.clipboardData
    .getData("text")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function insertPastedOptions(
  options: TemplateFieldOption[],
  optionUuid: string,
  pastedOptions: string[],
): TemplateFieldOption[] {
  return options.flatMap((option) => {
    if (option.uuid !== optionUuid) {
      return [option];
    }

    return [
      { ...option, value: `${option.value}${pastedOptions[0] ?? ""}` },
      ...pastedOptions.slice(1).map((value) => ({
        uuid: crypto.randomUUID(),
        value,
      })),
    ];
  });
}
