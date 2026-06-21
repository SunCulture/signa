"use client";

import type { ChangeEvent, ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function PillInput({
  icon,
  onChange,
  value,
  ...props
}: Omit<ComponentProps<typeof Input>, "onChange"> & {
  icon?: ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--auth-muted-foreground)]">
          {icon}
        </span>
      ) : null}
      <Input
        className={`h-11 rounded-full border-[var(--auth-input-border)] bg-white shadow-none focus-visible:ring-0 ${icon ? "pl-10" : "px-4"}`}
        onChange={(event) => onChange(event.target.value)}
        value={value}
        {...props}
      />
    </div>
  );
}

export function CheckRow({
  checked,
  disabled,
  label,
  onCheckedChange,
  trailing,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4">
      <label className="flex items-center gap-3 text-base">
        <Checkbox
          checked={checked}
          className="size-5 rounded-md border-[var(--auth-primary)] data-checked:bg-[var(--auth-primary)]"
          disabled={disabled}
          onCheckedChange={(value) => onCheckedChange(value === true)}
        />
        {label}
      </label>
      {trailing}
    </div>
  );
}

export function FileUploadButton({
  accept,
  icon,
  label,
  onChange,
}: {
  accept: string;
  icon: ReactNode;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--auth-input-border)] bg-white px-4 text-sm font-bold text-[var(--auth-primary)] hover:bg-[var(--auth-muted)]">
      {icon}
      {label}
      <input
        accept={accept}
        className="sr-only"
        onChange={onChange}
        type="file"
      />
    </label>
  );
}

export function SendRecipientsPrimaryButton({
  isSending,
}: {
  isSending: boolean;
}) {
  return (
    <Button
      className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
      disabled={isSending}
      type="submit"
    >
      {isSending ? "ADDING RECIPIENTS..." : "ADD RECIPIENTS"}
    </Button>
  );
}
