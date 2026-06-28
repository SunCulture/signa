import { runtimeJobNames } from '../runtime/runtime-jobs';

export type MailAttachment = {
  filename?: string;
  content?: Buffer | string;
  contentType?: string;
  path?: string;
};

export const mailTemplateNames = [
  'password-reset',
  'smtp-successful-setup',
  'submitter-completed',
  'submitter-declined',
  'submitter-documents-copy',
  'submitter-invitation',
  'submitter-invitation-reminder',
  'submitter-otp-verification',
  'template-otp-verification',
  'team-invitation',
  'user-invitation',
] as const;

export type MailTemplateName = (typeof mailTemplateNames)[number];

export const mailTemplateKeys = [
  'submitter-completed',
  'submitter-documents-copy',
  'submitter-invitation',
  'submitter-invitation-reminder',
] as const;

export type MailTemplateKey = (typeof mailTemplateKeys)[number];

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
  delivery?: MailDeliveryTraceInput;
};

export type MailDeliveryTraceInput = {
  attempt?: number;
  jobId?: string | number | null;
  submissionId?: string | null;
  submitterId?: string | null;
};

export type MailDeliveryStatus = 'sent' | 'skipped' | 'failed';

export type MailDeliveryResult = {
  status: MailDeliveryStatus;
  accepted: string[];
  rejected: string[];
  errorMessage?: string;
  errorStack?: string;
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
