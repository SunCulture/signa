import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { createTemplateSubmission } from "@/lib/api/submissions";
import {
  updateTemplatePreferences,
  type TemplateResponse,
} from "@/lib/api/templates";
import {
  buildSampleRecipientsCsv,
  buildSubmissionSubmitters,
  createRecipientSet,
  getRequestEmailBody,
  getRequestEmailSubject,
  getTemplateSendRoles,
  shouldSendEmail,
  shouldSendSms,
  validateRecipientSets,
} from "./template-send-recipient-mapping";
import type {
  RecipientContact,
  RecipientSet,
  SendRecipientTab,
} from "./template-send-recipient-types";

export function useTemplateSendRecipients(input: {
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
  template: TemplateResponse;
}) {
  const roles = useMemo(
    () => getTemplateSendRoles(input.template),
    [input.template],
  );
  const [activeTab, setActiveTab] = useState<SendRecipientTab>("email");
  const [recipientSets, setRecipientSets] = useState<RecipientSet[]>(() => [
    createRecipientSet(roles, "recipient-group-1"),
  ]);
  const [bulkRecipientSets, setBulkRecipientSets] = useState<RecipientSet[]>(
    [],
  );
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageBody, setMessageBody] = useState(
    getRequestEmailBody(input.template),
  );
  const [messageSubject, setMessageSubject] = useState(
    getRequestEmailSubject(input.template),
  );
  const [preserveOrder, setPreserveOrder] = useState(true);
  const [saveMessage, setSaveMessage] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const selectedSets =
    activeTab === "upload" ? bulkRecipientSets : recipientSets;
  const sampleHref = useMemo(
    () =>
      `data:text/csv;charset=utf-8,${encodeURIComponent(
        buildSampleRecipientsCsv(roles),
      )}`,
    [roles],
  );

  async function submitRecipients(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateRecipientSets({
      activeTab,
      recipientSets: selectedSets,
      roles,
    });

    if (validationError) {
      toast.error("Recipients are incomplete", {
        description: validationError,
      });
      return;
    }

    await createRecipientSubmissions({
      activeTab,
      messageBody,
      messageSubject,
      onOpenChange: input.onOpenChange,
      onSent: input.onSent,
      preserveOrder,
      roles,
      saveMessage,
      selectedSets,
      sendEmail,
      sendSms,
      setIsSending,
      template: input.template,
    });
  }

  return {
    activeTab,
    bulkFileName,
    bulkRecipientCount: bulkRecipientSets.length,
    isMessageOpen,
    isSending,
    messageBody,
    messageSubject,
    preserveOrder,
    recipientSets,
    roles,
    sampleHref,
    saveMessage,
    selectedSetCount: selectedSets.length,
    sendEmail,
    sendSms,
    setActiveTab,
    setBulkFileName,
    setBulkRecipientSets,
    setIsMessageOpen,
    setMessageBody,
    setMessageSubject,
    setPreserveOrder,
    setSaveMessage,
    setSendEmail,
    setSendSms,
    submitRecipients,
    updateRecipientContact: (
      setId: string,
      roleId: string,
      patch: Partial<RecipientContact>,
    ) => updateRecipientContact(setRecipientSets, setId, roleId, patch),
    addRecipientSet: () => addRecipientSet(setRecipientSets, roles),
    removeRecipientSet: (setId: string) =>
      removeRecipientSet(setRecipientSets, setId),
  };
}

async function createRecipientSubmissions(input: {
  activeTab: SendRecipientTab;
  messageBody: string;
  messageSubject: string;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
  preserveOrder: boolean;
  roles: ReturnType<typeof getTemplateSendRoles>;
  saveMessage: boolean;
  selectedSets: RecipientSet[];
  sendEmail: boolean;
  sendSms: boolean;
  setIsSending: (isSending: boolean) => void;
  template: TemplateResponse;
}) {
  input.setIsSending(true);

  try {
    await saveMessageDefaultsIfRequested(input);
    await submitRecipientGroups(input);
    toastSignatureRequestsCreated(input.selectedSets.length);
    input.onOpenChange(false);
    input.onSent?.();
  } catch (error) {
    toast.error("Recipients could not be added", {
      description:
        error instanceof Error
          ? error.message
          : "Please check the recipients and try again.",
    });
  } finally {
    input.setIsSending(false);
  }
}

async function saveMessageDefaultsIfRequested(input: {
  messageBody: string;
  messageSubject: string;
  saveMessage: boolean;
  template: TemplateResponse;
}) {
  if (!input.saveMessage) return;

  await updateTemplatePreferences(input.template.id, {
    request_email_body: input.messageBody.trim(),
    request_email_subject: input.messageSubject.trim(),
  });
}

async function submitRecipientGroups(input: {
  activeTab: SendRecipientTab;
  messageBody: string;
  messageSubject: string;
  preserveOrder: boolean;
  roles: ReturnType<typeof getTemplateSendRoles>;
  selectedSets: RecipientSet[];
  sendEmail: boolean;
  sendSms: boolean;
  template: TemplateResponse;
}) {
  for (const recipientSet of input.selectedSets) {
    await createTemplateSubmission(input.template.id, {
      auto_sign_owner:
        input.template.preferences.auto_sign_owner_enabled === true
          ? true
          : undefined,
      auto_sign_owner_role:
        getStringPreference(input.template.preferences.auto_sign_owner_role) ??
        undefined,
      message: shouldSendEmail(input.activeTab, input.sendEmail)
        ? {
            body: input.messageBody.trim(),
            subject: input.messageSubject.trim(),
          }
        : undefined,
      name: input.template.name,
      send_email: shouldSendEmail(input.activeTab, input.sendEmail),
      send_sms: shouldSendSms(input.activeTab, input.sendSms),
      submitters: buildSubmissionSubmitters({
        activeTab: input.activeTab,
        recipientSet,
        roles: input.roles,
      }),
      submitters_order: input.preserveOrder ? "preserved" : "random",
    });
  }
}

function addRecipientSet(
  setRecipientSets: Dispatch<SetStateAction<RecipientSet[]>>,
  roles: ReturnType<typeof getTemplateSendRoles>,
) {
  setRecipientSets((currentSets) => [
    ...currentSets,
    createRecipientSet(
      roles,
      `recipient-group-${currentSets.length + 1}-${Date.now()}`,
    ),
  ]);
}

function getStringPreference(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function removeRecipientSet(
  setRecipientSets: Dispatch<SetStateAction<RecipientSet[]>>,
  setId: string,
) {
  setRecipientSets((currentSets) =>
    currentSets.length === 1
      ? currentSets
      : currentSets.filter((recipientSet) => recipientSet.id !== setId),
  );
}

function updateRecipientContact(
  setRecipientSets: Dispatch<SetStateAction<RecipientSet[]>>,
  setId: string,
  roleId: string,
  patch: Partial<RecipientContact>,
) {
  setRecipientSets((currentSets) =>
    currentSets.map((recipientSet) =>
      recipientSet.id === setId
        ? {
            ...recipientSet,
            contacts: {
              ...recipientSet.contacts,
              [roleId]: {
                ...recipientSet.contacts[roleId],
                ...patch,
              },
            },
          }
        : recipientSet,
    ),
  );
}

function toastSignatureRequestsCreated(count: number) {
  toast.success("Signature requests created", {
    description:
      count === 1
        ? "The recipients can now complete this document."
        : `${count} recipient groups can now complete this document.`,
  });
}
