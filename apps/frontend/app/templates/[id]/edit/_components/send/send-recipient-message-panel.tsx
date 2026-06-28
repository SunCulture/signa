"use client";

import { InfoIcon, MessageSquareTextIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmailMarkdownEditor,
  type EmailTemplateVariable,
} from "../../email-markdown-editor";
import { CheckRow } from "./send-recipient-controls";

const signatureRequestEmailVariables = [
  { label: "Template name", value: "template.name" },
  { label: "Submitter link", value: "submitter.link" },
  { label: "Account name", value: "account.name" },
] satisfies EmailTemplateVariable[];

export function SendRecipientMessagePanel({
  messageBody,
  messageSubject,
  onBodyChange,
  onSaveMessageChange,
  onSubjectChange,
  saveMessage,
}: {
  messageBody: string;
  messageSubject: string;
  onBodyChange: (value: string) => void;
  onSaveMessageChange: (value: boolean) => void;
  onSubjectChange: (value: string) => void;
  saveMessage: boolean;
}) {
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--auth-border)] bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-[var(--auth-muted)] text-[var(--auth-primary)]">
          <MessageSquareTextIcon className="size-4" />
        </span>
        <p className="font-bold">Signature request message</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="send-message-subject">Subject</Label>
        <Input
          className="h-11 rounded-full border-[var(--auth-input-border)] bg-white px-4 shadow-none focus-visible:ring-0"
          id="send-message-subject"
          onChange={(event) => onSubjectChange(event.target.value)}
          value={messageSubject}
        />
      </div>
      <EmailMarkdownEditor
        label="Body"
        onChange={onBodyChange}
        value={messageBody}
        variables={signatureRequestEmailVariables}
      />
      <CheckRow
        checked={saveMessage}
        label="Save as default template message"
        onCheckedChange={onSaveMessageChange}
      />
    </div>
  );
}

export function SmsDeliveryNotice() {
  return (
    <div className="mt-4 flex gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--auth-muted),white_20%)] p-4">
      <InfoIcon className="mt-1 size-5 shrink-0 text-[var(--auth-primary)]" />
      <div>
        <p className="font-bold">Send signature requests via SMS</p>
        <p className="text-sm text-[var(--auth-muted-foreground)]">
          Phone recipients will receive a signing link when SMS delivery is
          configured for this workspace.
        </p>
      </div>
    </div>
  );
}
