"use client";

import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkRecipientUploadPanel } from "./bulk-recipient-upload-panel";
import { RoleRecipientSetsPanel } from "./role-recipient-sets-panel";
import { CheckRow } from "./send-recipient-controls";
import type {
  RecipientContact,
  RecipientSet,
  SendRecipientTab,
  TemplateSendRole,
} from "./template-send-recipient-types";

export function SendRecipientTabs() {
  return (
    <div className="px-5 pt-4">
      <TabsList className="mx-auto grid h-10 w-full max-w-[450px] grid-cols-4 rounded-full bg-[color-mix(in_srgb,var(--auth-muted),white_25%)] p-1">
        <TabsTrigger className="rounded-full font-bold" value="email">
          via Email
        </TabsTrigger>
        <TabsTrigger className="rounded-full font-bold" value="phone">
          via Phone
        </TabsTrigger>
        <TabsTrigger className="rounded-full font-bold" value="detailed">
          Detailed
        </TabsTrigger>
        <TabsTrigger className="rounded-full font-bold" value="upload">
          Upload List
        </TabsTrigger>
      </TabsList>
    </div>
  );
}

export function SendRecipientTabContent({
  activeTab,
  bulkFileName,
  bulkRecipientCount,
  onAddSet,
  onBulkFileNameChange,
  onBulkRecipientSetsChange,
  onRemoveSet,
  onUpdateContact,
  recipientSets,
  roles,
  sampleHref,
}: {
  activeTab: SendRecipientTab;
  bulkFileName: string | null;
  bulkRecipientCount: number;
  onAddSet: () => void;
  onBulkFileNameChange: (fileName: string | null) => void;
  onBulkRecipientSetsChange: (sets: RecipientSet[]) => void;
  onRemoveSet: (setId: string) => void;
  onUpdateContact: (
    setId: string,
    roleId: string,
    patch: Partial<RecipientContact>,
  ) => void;
  recipientSets: RecipientSet[];
  roles: TemplateSendRole[];
  sampleHref: string;
}) {
  if (activeTab === "upload") {
    return (
      <TabsContent value="upload">
        <BulkRecipientUploadPanel
          bulkFileName={bulkFileName}
          onBulkFileNameChange={onBulkFileNameChange}
          onRecipientSetsParsed={onBulkRecipientSetsChange}
          parsedCount={bulkRecipientCount}
          roles={roles}
          sampleHref={sampleHref}
        />
      </TabsContent>
    );
  }

  return (
    <TabsContent value={activeTab}>
      <RoleRecipientSetsPanel
        mode={activeTab}
        onAddSet={onAddSet}
        onRemoveSet={onRemoveSet}
        onUpdateContact={onUpdateContact}
        recipientSets={recipientSets}
        roles={roles}
      />
    </TabsContent>
  );
}

export function SendRecipientOptions({
  activeTab,
  isMessageOpen,
  onMessageOpenChange,
  onPreserveOrderChange,
  onSendEmailChange,
  onSendSmsChange,
  preserveOrder,
  sendEmail,
  sendSms,
}: {
  activeTab: SendRecipientTab;
  isMessageOpen: boolean;
  onMessageOpenChange: (open: boolean) => void;
  onPreserveOrderChange: (preserve: boolean) => void;
  onSendEmailChange: (send: boolean) => void;
  onSendSmsChange: (send: boolean) => void;
  preserveOrder: boolean;
  sendEmail: boolean;
  sendSms: boolean;
}) {
  return (
    <div className="mt-5 grid gap-3">
      <CheckRow
        checked={preserveOrder}
        label="Preserve order"
        onCheckedChange={onPreserveOrderChange}
      />
      {activeTab !== "phone" ? (
        <CheckRow
          checked={sendEmail}
          label="Send Email"
          onCheckedChange={onSendEmailChange}
          trailing={
            <button
              className="text-sm font-medium underline underline-offset-2"
              onClick={() => onMessageOpenChange(!isMessageOpen)}
              type="button"
            >
              Edit message
            </button>
          }
        />
      ) : null}
      {activeTab !== "email" ? (
        <CheckRow
          checked={activeTab === "phone" ? true : sendSms}
          disabled={activeTab === "phone"}
          label="Send SMS"
          onCheckedChange={onSendSmsChange}
        />
      ) : null}
    </div>
  );
}

export function RecipientGroupCount({
  activeTab,
  count,
}: {
  activeTab: SendRecipientTab;
  count: number;
}) {
  return (
    <div className="mt-5 text-xs text-[var(--auth-muted-foreground)]">
      {count > 0
        ? `${count} recipient group${count === 1 ? "" : "s"} ready.`
        : activeTab === "upload"
          ? "Upload a CSV or XLSX file to create recipient groups."
          : "Add at least one recipient group."}
    </div>
  );
}
