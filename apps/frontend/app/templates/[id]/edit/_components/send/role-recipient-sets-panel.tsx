"use client";

import { MailIcon, PhoneIcon, UserRoundPlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PillInput } from "./send-recipient-controls";
import type {
  RecipientContact,
  RecipientSet,
  SendRecipientTab,
  TemplateSendRole,
} from "./template-send-recipient-types";

type RoleRecipientMode = Exclude<SendRecipientTab, "upload">;

export function RoleRecipientSetsPanel({
  mode,
  onAddSet,
  onRemoveSet,
  onUpdateContact,
  recipientSets,
  roles,
}: {
  mode: RoleRecipientMode;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateContact: (
    setId: string,
    roleId: string,
    patch: Partial<RecipientContact>,
  ) => void;
  recipientSets: RecipientSet[];
  roles: TemplateSendRole[];
}) {
  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--auth-muted),white_28%)] p-4">
        {recipientSets.map((recipientSet, setIndex) => (
          <RecipientSetFields
            key={recipientSet.id}
            mode={mode}
            onRemoveSet={onRemoveSet}
            onUpdateContact={onUpdateContact}
            recipientSet={recipientSet}
            recipientSetCount={recipientSets.length}
            setIndex={setIndex}
            roles={roles}
          />
        ))}
      </div>
      <Button
        className="mt-4 h-9 w-full rounded-full bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_8%)] font-bold text-[var(--auth-primary)] hover:bg-[color-mix(in_srgb,var(--auth-muted),var(--auth-primary)_14%)]"
        onClick={onAddSet}
        type="button"
        variant="ghost"
      >
        <UserRoundPlusIcon data-icon="inline-start" />
        ADD NEW
      </Button>
    </>
  );
}

function RecipientSetFields({
  mode,
  onRemoveSet,
  onUpdateContact,
  recipientSet,
  recipientSetCount,
  roles,
  setIndex,
}: {
  mode: RoleRecipientMode;
  onRemoveSet: (setId: string) => void;
  onUpdateContact: (
    setId: string,
    roleId: string,
    patch: Partial<RecipientContact>,
  ) => void;
  recipientSet: RecipientSet;
  recipientSetCount: number;
  roles: TemplateSendRole[];
  setIndex: number;
}) {
  return (
    <div className="grid gap-3">
      {recipientSetCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">Recipient group {setIndex + 1}</p>
          <Button
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => onRemoveSet(recipientSet.id)}
            type="button"
            variant="ghost"
          >
            Remove
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <RoleContactFields
            contact={recipientSet.contacts[role.id]}
            key={role.id}
            mode={mode}
            onChange={(patch) =>
              onUpdateContact(recipientSet.id, role.id, patch)
            }
            roleName={role.name}
          />
        ))}
      </div>
    </div>
  );
}

function RoleContactFields({
  contact,
  mode,
  onChange,
  roleName,
}: {
  contact: RecipientContact;
  mode: RoleRecipientMode;
  onChange: (patch: Partial<RecipientContact>) => void;
  roleName: string;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-[var(--auth-primary)]">
        {roleName}
      </Label>
      {mode === "email" ? (
        <PillInput
          autoComplete="email"
          icon={<MailIcon className="size-4" />}
          onChange={(value) => onChange({ email: value })}
          placeholder="Email"
          type="email"
          value={contact.email}
        />
      ) : null}
      {mode === "phone" ? (
        <PhoneContactFields contact={contact} onChange={onChange} />
      ) : null}
      {mode === "detailed" ? (
        <DetailedContactFields contact={contact} onChange={onChange} />
      ) : null}
    </div>
  );
}

function PhoneContactFields({
  contact,
  onChange,
}: {
  contact: RecipientContact;
  onChange: (patch: Partial<RecipientContact>) => void;
}) {
  return (
    <>
      <PillInput
        autoComplete="tel"
        icon={<PhoneIcon className="size-4" />}
        onChange={(value) => onChange({ phone: value })}
        placeholder="Phone"
        type="tel"
        value={contact.phone}
      />
      <PillInput
        autoComplete="name"
        onChange={(value) => onChange({ name: value })}
        placeholder="Name (optional)"
        value={contact.name}
      />
    </>
  );
}

function DetailedContactFields({
  contact,
  onChange,
}: {
  contact: RecipientContact;
  onChange: (patch: Partial<RecipientContact>) => void;
}) {
  return (
    <>
      <PillInput
        autoComplete="name"
        onChange={(value) => onChange({ name: value })}
        placeholder="Name"
        value={contact.name}
      />
      <PillInput
        autoComplete="email"
        icon={<MailIcon className="size-4" />}
        onChange={(value) => onChange({ email: value })}
        placeholder="Email (optional)"
        type="email"
        value={contact.email}
      />
      <PillInput
        autoComplete="tel"
        icon={<PhoneIcon className="size-4" />}
        onChange={(value) => onChange({ phone: value })}
        placeholder="Phone (optional)"
        type="tel"
        value={contact.phone}
      />
    </>
  );
}
