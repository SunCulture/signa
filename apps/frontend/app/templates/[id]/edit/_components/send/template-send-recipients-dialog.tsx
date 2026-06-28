"use client";

import { SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import type { TemplateResponse } from "@/lib/api/templates";
import {
  RecipientGroupCount,
  SendRecipientOptions,
  SendRecipientTabContent,
  SendRecipientTabs,
} from "./send-recipient-dialog-sections";
import {
  SendRecipientMessagePanel,
  SmsDeliveryNotice,
} from "./send-recipient-message-panel";
import { useTemplateSendRecipients } from "./use-template-send-recipients";

type SendRecipientsController = ReturnType<typeof useTemplateSendRecipients>;

export function TemplateSendRecipientsDialog({
  onOpenChange,
  onSent,
  open,
  template,
}: {
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
  open: boolean;
  template: TemplateResponse;
}) {
  const sendRecipients = useTemplateSendRecipients({
    onOpenChange,
    onSent,
    template,
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90svh] max-w-[590px] overflow-hidden rounded-3xl bg-[var(--auth-background)] p-0 text-[var(--auth-foreground)]">
        <form
          className="flex max-h-[90svh] flex-col"
          onSubmit={sendRecipients.submitRecipients}
        >
          <DialogHeader className="border-b border-[var(--auth-border)] px-5 py-4">
            <DialogTitle className="pr-8 text-lg font-bold">
              Add New Recipients
            </DialogTitle>
          </DialogHeader>

          <Tabs
            className="min-h-0 flex-1 gap-0"
            onValueChange={(value) =>
              sendRecipients.setActiveTab(value as typeof sendRecipients.activeTab)
            }
            value={sendRecipients.activeTab}
          >
            <SendRecipientTabs />
            <SendRecipientsDialogBody sendRecipients={sendRecipients} />
          </Tabs>

          <div className="border-t border-[var(--auth-border)] p-5">
            <Button
              className="h-12 w-full rounded-full bg-[var(--auth-primary)] font-bold text-[var(--auth-primary-foreground)] hover:bg-[var(--auth-primary-hover)]"
              disabled={sendRecipients.isSending}
              type="submit"
            >
              <SendIcon data-icon="inline-start" />
              {sendRecipients.isSending
                ? "ADDING RECIPIENTS..."
                : "ADD RECIPIENTS"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendRecipientsDialogBody({
  sendRecipients,
}: {
  sendRecipients: SendRecipientsController;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
      <SendRecipientTabContent
        activeTab={sendRecipients.activeTab}
        bulkFileName={sendRecipients.bulkFileName}
        bulkRecipientCount={sendRecipients.bulkRecipientCount}
        onAddSet={sendRecipients.addRecipientSet}
        onBulkFileNameChange={sendRecipients.setBulkFileName}
        onBulkRecipientSetsChange={sendRecipients.setBulkRecipientSets}
        onRemoveSet={sendRecipients.removeRecipientSet}
        onUpdateContact={sendRecipients.updateRecipientContact}
        recipientSets={sendRecipients.recipientSets}
        roles={sendRecipients.roles}
        sampleHref={sendRecipients.sampleHref}
      />
      <SendRecipientOptions
        activeTab={sendRecipients.activeTab}
        isMessageOpen={sendRecipients.isMessageOpen}
        onMessageOpenChange={sendRecipients.setIsMessageOpen}
        onPreserveOrderChange={sendRecipients.setPreserveOrder}
        onSendEmailChange={sendRecipients.setSendEmail}
        onSendSmsChange={sendRecipients.setSendSms}
        preserveOrder={sendRecipients.preserveOrder}
        sendEmail={sendRecipients.sendEmail}
        sendSms={sendRecipients.sendSms}
      />
      <OptionalMessagePanel sendRecipients={sendRecipients} />
      <OptionalSmsNotice activeTab={sendRecipients.activeTab} />
      <RecipientGroupCount
        activeTab={sendRecipients.activeTab}
        count={sendRecipients.selectedSetCount}
      />
    </div>
  );
}

function OptionalMessagePanel({
  sendRecipients,
}: {
  sendRecipients: SendRecipientsController;
}) {
  if (!sendRecipients.isMessageOpen || sendRecipients.activeTab === "phone") {
    return null;
  }

  return (
    <SendRecipientMessagePanel
      messageBody={sendRecipients.messageBody}
      messageSubject={sendRecipients.messageSubject}
      onBodyChange={sendRecipients.setMessageBody}
      onSaveMessageChange={sendRecipients.setSaveMessage}
      onSubjectChange={sendRecipients.setMessageSubject}
      saveMessage={sendRecipients.saveMessage}
    />
  );
}

function OptionalSmsNotice({
  activeTab,
}: {
  activeTab: SendRecipientsController["activeTab"];
}) {
  return activeTab === "phone" || activeTab === "detailed" ? (
    <SmsDeliveryNotice />
  ) : null;
}
