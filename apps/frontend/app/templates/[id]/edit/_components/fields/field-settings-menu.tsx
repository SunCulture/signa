"use client";

import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import phoneData from "@/lib/phone-data";
import {
  fieldValidationOptions,
  getDefaultFieldFormat,
  getFieldFormats,
  getFieldStringValue,
  getValidationKind,
  getValidationPattern,
  isRecord,
  isTextEditableField,
  parseLengthValidation,
  type TemplateEditorField,
} from "../../_lib/template-editor-model";

const phoneCountries = phoneData.map(([iso, name, dial, flag]) => ({
  dial,
  flag,
  iso,
  name,
}));

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
  onSaveCustomField,
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
  onSaveCustomField: (field: TemplateEditorField) => Promise<void>;
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
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="truncate">{title}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <InlineFieldFormatControls
            field={field}
            onUpdateField={onUpdateField}
          />
          <DropdownMenuSeparator />
          <MoveFieldMenuItems
            fields={fields}
            index={index}
            onMoveDown={onMoveDown}
            onMoveUp={onMoveUp}
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <SlidersHorizontalIcon className="size-4" />
            More format options
          </DropdownMenuItem>
          <RequiredFieldMenuItem
            field={field}
            onUpdateField={onUpdateField}
            title={title}
          />
          <ReadonlyFieldMenuItem
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
        <DropdownMenuItem onClick={() => void onSaveCustomField(field)}>
          <SaveIcon className="size-4" />
          Save as custom field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlineFieldFormatControls({
  field,
  onUpdateField,
}: {
  field: TemplateEditorField;
  onUpdateField: (
    fieldUuid: string,
    patch: Partial<TemplateEditorField>,
  ) => Promise<void>;
}) {
  const preferences = isRecord(field.preferences) ? field.preferences : {};
  const validation = isRecord(field.validation) ? field.validation : {};
  const supportsDefault =
    isTextEditableField(field.type) || field.type === "checkbox";
  const supportsFormat = field.type === "date" || field.type === "number";
  const supportsTextValidation = ["cells", "text"].includes(field.type);
  const supportsPhoneValidation = field.type === "phone";
  const lengthValidation = parseLengthValidation(
    getFieldStringValue(validation.pattern),
  );
  const [defaultValue, setDefaultValue] = useState(() =>
    field.type === "checkbox"
      ? field.default_value === true
        ? "true"
        : "false"
      : getFieldStringValue(field.default_value),
  );
  const [validationKind, setValidationKind] = useState(() =>
    getValidationKind(field),
  );
  const [lengthMin, setLengthMin] = useState(lengthValidation?.min ?? "");
  const [lengthMax, setLengthMax] = useState(lengthValidation?.max ?? "");
  const [minValue, setMinValue] = useState(() =>
    getFieldStringValue(validation.min),
  );
  const [maxValue, setMaxValue] = useState(() =>
    getFieldStringValue(validation.max),
  );
  const [format, setFormat] = useState(() =>
    typeof preferences.format === "string"
      ? preferences.format
      : getDefaultFieldFormat(field.type),
  );
  const [phoneCountry, setPhoneCountry] = useState(() =>
    getFieldStringValue(validation.phone_country),
  );

  async function saveDefaultValue() {
    if (!supportsDefault) {
      return;
    }

    await onUpdateField(field.uuid, {
      default_value:
        field.type === "checkbox" ? defaultValue === "true" : defaultValue,
    });
  }

  async function updateValidationKind(nextKind: string) {
    setValidationKind(nextKind);

    if (!nextKind) {
      await onUpdateField(field.uuid, { validation: undefined });
      return;
    }

    if (nextKind === "length") {
      await onUpdateField(field.uuid, {
        validation: {
          pattern: `.{${lengthMin.trim() || "0"},${lengthMax.trim()}}`,
        },
      });
      return;
    }

    await onUpdateField(field.uuid, {
      validation: { pattern: getValidationPattern(nextKind) },
    });
  }

  async function saveLengthValidation() {
    await onUpdateField(field.uuid, {
      validation: {
        pattern: `.{${lengthMin.trim() || "0"},${lengthMax.trim()}}`,
      },
    });
  }

  async function saveNumberValidation() {
    const nextValidation = { ...validation };

    if (minValue.trim()) {
      nextValidation.min = Number(minValue);
    } else {
      delete nextValidation.min;
    }

    if (maxValue.trim()) {
      nextValidation.max = Number(maxValue);
    } else {
      delete nextValidation.max;
    }

    await onUpdateField(field.uuid, {
      validation: Object.keys(nextValidation).length
        ? nextValidation
        : undefined,
    });
  }

  async function updatePhoneCountry(nextCountry: string) {
    setPhoneCountry(nextCountry);

    const nextValidation = { ...validation };

    if (nextCountry) {
      nextValidation.phone_country = nextCountry;
    } else {
      delete nextValidation.phone_country;
    }

    await onUpdateField(field.uuid, {
      validation: Object.keys(nextValidation).length
        ? nextValidation
        : undefined,
    });
  }

  async function saveFormat(nextFormat: string) {
    setFormat(nextFormat);
    await onUpdateField(field.uuid, {
      preferences: {
        ...preferences,
        format: nextFormat || getDefaultFieldFormat(field.type),
      },
    });
  }

  return (
    <div
      className="flex flex-col gap-2 px-2 py-1.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {supportsDefault ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--auth-label)]">
            Default value
          </span>
          {field.type === "checkbox" ? (
            <select
              className="h-8 rounded-full border border-[var(--auth-input-border)] bg-background px-3 text-xs outline-none focus:border-[var(--auth-primary)]"
              onChange={(event) => {
                setDefaultValue(event.target.value);
                void onUpdateField(field.uuid, {
                  default_value: event.target.value === "true",
                });
              }}
              value={defaultValue}
            >
              <option value="false">Unchecked</option>
              <option value="true">Checked</option>
            </select>
          ) : (
            <Input
              className="h-8 rounded-full bg-background px-3 text-xs"
              onBlur={() => void saveDefaultValue()}
              onChange={(event) => setDefaultValue(event.target.value)}
              placeholder="Default value"
              value={defaultValue}
            />
          )}
        </div>
      ) : null}

      {supportsFormat ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--auth-label)]">
            Format
          </span>
          <select
            className="h-8 rounded-full border border-[var(--auth-input-border)] bg-background px-3 text-xs outline-none focus:border-[var(--auth-primary)]"
            onChange={(event) => void saveFormat(event.target.value)}
            value={format}
          >
            {getFieldFormats(field.type).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {supportsTextValidation ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--auth-label)]">
            Validation
          </span>
          <select
            className="h-8 rounded-full border border-[var(--auth-input-border)] bg-background px-3 text-xs outline-none focus:border-[var(--auth-primary)]"
            onChange={(event) => void updateValidationKind(event.target.value)}
            value={validationKind}
          >
            <option value="">None</option>
            {fieldValidationOptions.map((option) => (
              <option key={option.kind} value={option.kind}>
                {option.label}
              </option>
            ))}
          </select>
          {validationKind === "length" ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                className="h-8 rounded-full bg-background px-3 text-xs"
                min={0}
                onBlur={() => void saveLengthValidation()}
                onChange={(event) => setLengthMin(event.target.value)}
                placeholder="Min"
                type="number"
                value={lengthMin}
              />
              <Input
                className="h-8 rounded-full bg-background px-3 text-xs"
                min={1}
                onBlur={() => void saveLengthValidation()}
                onChange={(event) => setLengthMax(event.target.value)}
                placeholder="Max"
                type="number"
                value={lengthMax}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {supportsPhoneValidation ? (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--auth-label)]">
            Phone country
          </span>
          <select
            className="h-8 rounded-full border border-[var(--auth-input-border)] bg-background px-3 text-xs outline-none focus:border-[var(--auth-primary)]"
            onChange={(event) => void updatePhoneCountry(event.target.value)}
            value={phoneCountry}
          >
            <option value="">Signer can choose</option>
            {phoneCountries.map((country) => (
              <option key={country.iso} value={country.iso}>
                {country.flag} +{country.dial} {country.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {field.type === "number" ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[var(--auth-label)]">
              Min
            </span>
            <Input
              className="h-8 rounded-full bg-background px-3 text-xs"
              onBlur={() => void saveNumberValidation()}
              onChange={(event) => setMinValue(event.target.value)}
              placeholder="Min"
              type="number"
              value={minValue}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-[var(--auth-label)]">
              Max
            </span>
            <Input
              className="h-8 rounded-full bg-background px-3 text-xs"
              onBlur={() => void saveNumberValidation()}
              onChange={(event) => setMaxValue(event.target.value)}
              placeholder="Max"
              type="number"
              value={maxValue}
            />
          </div>
        </div>
      ) : null}
    </div>
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

function ReadonlyFieldMenuItem({
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
      <span className="min-w-0 flex-1">Read-only</span>
      <Switch
        aria-label={`Toggle read-only for ${title}`}
        checked={field.readonly === true}
        onCheckedChange={(checked) =>
          void onUpdateField(field.uuid, { readonly: checked })
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
