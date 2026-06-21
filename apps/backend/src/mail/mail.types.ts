import { runtimeJobNames } from '../runtime/runtime-jobs';

export type MailAttachment = {
  filename?: string;
  content?: Buffer | string;
  contentType?: string;
  path?: string;
};

export type MailTemplateName =
  | 'password-reset'
  | 'smtp-successful-setup'
  | 'submitter-completed'
  | 'submitter-declined'
  | 'submitter-documents-copy'
  | 'submitter-invitation'
  | 'submitter-invitation-reminder'
  | 'submitter-otp-verification'
  | 'template-otp-verification'
  | 'user-invitation';

export type MailTemplateKey =
  | 'submitter-completed'
  | 'submitter-documents-copy'
  | 'submitter-invitation'
  | 'submitter-invitation-reminder';

export type MailAddress = {
  email: string;
  name?: string | null;
};

export type SendTemplateMailInput = {
  accountId?: string;
  to: MailAddress | MailAddress[];
  subject: string;
  template: MailTemplateName;
  context?: Record<string, unknown>;
  from?: MailAddress | string;
  replyTo?: MailAddress | string | null;
  attachments?: MailAttachment[];
};

export type MailDeliveryStatus = 'sent' | 'skipped';

export type MailDeliveryResult = {
  status: MailDeliveryStatus;
  accepted: string[];
  rejected: string[];
  messageId?: string;
  response?: string;
};

export type SubmitterMailEvent = {
  submitterId: string;
  accountId?: string;
  reason?: string | null;
  locale?: string | null;
};

export type MailJobMap = {
  [runtimeJobNames.deliverCompletedEmail]: {
    submitterId: string;
  };
  [runtimeJobNames.deliverDeclinedEmail]: {
    submitterId: string;
    reason?: string | null;
  };
  [runtimeJobNames.deliverDocumentsCopyEmail]: {
    submitterId: string;
  };
  [runtimeJobNames.deliverReminderEmail]: {
    reminderIndex: number;
    submitterId: string;
  };
  [runtimeJobNames.deliverSignatureRequestEmail]: {
    submitterId: string;
  };
  [runtimeJobNames.deliverSubmitterVerificationEmail]: {
    submitterId: string;
    locale?: string | null;
  };
};

export type MailJobName = keyof MailJobMap;
