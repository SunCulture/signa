import type { PreferencesFormState } from "./template-preferences-types";

export const defaultRequestEmailSubject = "You are invited to sign a document";

export const defaultRequestEmailBody = `Hi there,

You have been invited to sign the "{template.name}".

[Review and Sign]({submitter.link})

Please contact us by replying to this email if you have any questions.

Thanks,
{account.name}`;

export const defaultDocumentsCopyEmailSubject = "Your document copy";

export const defaultDocumentsCopyEmailBody = `Hi there,

Please check the copy of your "{template.name}" in the email attachments.
Alternatively, you can review and download your copy using the link below:

[{template.name}]({documents.link})

Thanks,
{account.name}`;

export const defaultCompletedNotificationEmailSubject =
  "{template.name} has been completed by {submission.submitters}";

export const defaultCompletedNotificationEmailBody = `Hi,

"{template.name}" has been completed by {submission.submitters}

{submission.link}`;

export function preferencesToFormState(
  preferences: Record<string, unknown>,
): PreferencesFormState {
  const completedMessage = getRecord(preferences.completed_message);

  return {
    bccCompleted: getString(preferences.bcc_completed),
    completedMessageBody: getString(completedMessage.body),
    completedRedirectUrl: getString(preferences.completed_redirect_url),
    completedNotificationEmailAttachAudit:
      preferences.completed_notification_email_attach_audit !== false,
    completedNotificationEmailAttachDocuments:
      preferences.completed_notification_email_attach_documents !== false,
    completedNotificationEmailBody: getString(
      preferences.completed_notification_email_body,
      defaultCompletedNotificationEmailBody,
    ),
    completedNotificationEmailEnabled:
      preferences.completed_notification_email_enabled !== false,
    completedNotificationEmailSubject: getString(
      preferences.completed_notification_email_subject,
      defaultCompletedNotificationEmailSubject,
    ),
    defaultExpireAt: toDateTimeLocalValue(preferences.default_expire_at),
    defaultExpireAtDuration:
      getString(preferences.default_expire_at_duration) || "none",
    documentsCopyEmailAttachAudit:
      preferences.documents_copy_email_attach_audit !== false,
    documentsCopyEmailAttachDocuments:
      preferences.documents_copy_email_attach_documents !== false,
    documentsCopyEmailBody: getString(
      preferences.documents_copy_email_body,
      defaultDocumentsCopyEmailBody,
    ),
    documentsCopyEmailEnabled:
      preferences.documents_copy_email_enabled !== false,
    documentsCopyEmailReplyTo: getString(
      preferences.documents_copy_email_reply_to,
    ),
    documentsCopyEmailSubject: getString(
      preferences.documents_copy_email_subject,
      defaultDocumentsCopyEmailSubject,
    ),
    linkFormFields: getStringArray(preferences.link_form_fields, ["email"]),
    ownerAutoSignMode:
      preferences.auto_sign_owner_enabled === true
        ? "enabled"
        : preferences.auto_sign_owner_enabled === false
          ? "disabled"
          : "inherit",
    ownerAutoSignRole: getString(
      preferences.auto_sign_owner_role,
      "First Party",
    ),
    ownerAutoSignSendEmail: preferences.auto_sign_owner_send_email === true,
    requestEmailBody: getString(
      preferences.request_email_body,
      defaultRequestEmailBody,
    ),
    requestEmailEnabled: preferences.request_email_enabled !== false,
    requestEmailSubject: getString(
      preferences.request_email_subject,
      defaultRequestEmailSubject,
    ),
    requireEmailTwoFactor: preferences.require_email_2fa === true,
    requirePhoneTwoFactor: preferences.require_phone_2fa === true,
  };
}

export function formStateToPreferences(
  formState: PreferencesFormState,
): Record<string, unknown> {
  return removeBlankPreferenceValues({
    bcc_completed: formState.bccCompleted,
    completed_message: { body: formState.completedMessageBody },
    completed_redirect_url: formState.completedRedirectUrl,
    completed_notification_email_attach_audit:
      formState.completedNotificationEmailAttachAudit,
    completed_notification_email_attach_documents:
      formState.completedNotificationEmailAttachDocuments,
    completed_notification_email_body: formState.completedNotificationEmailBody,
    completed_notification_email_enabled:
      formState.completedNotificationEmailEnabled,
    completed_notification_email_subject:
      formState.completedNotificationEmailSubject,
    default_expire_at:
      formState.defaultExpireAtDuration === "specified_date"
        ? fromDateTimeLocalValue(formState.defaultExpireAt)
        : "",
    default_expire_at_duration:
      formState.defaultExpireAtDuration === "none"
        ? ""
        : formState.defaultExpireAtDuration,
    documents_copy_email_attach_audit:
      formState.documentsCopyEmailAttachAudit,
    documents_copy_email_attach_documents:
      formState.documentsCopyEmailAttachDocuments,
    documents_copy_email_body: formState.documentsCopyEmailBody,
    documents_copy_email_enabled: formState.documentsCopyEmailEnabled,
    documents_copy_email_reply_to: formState.documentsCopyEmailReplyTo,
    documents_copy_email_subject: formState.documentsCopyEmailSubject,
    link_form_fields: formState.linkFormFields,
    auto_sign_owner_enabled:
      formState.ownerAutoSignMode === "inherit"
        ? undefined
        : formState.ownerAutoSignMode === "enabled",
    auto_sign_owner_role: formState.ownerAutoSignRole,
    auto_sign_owner_send_email: formState.ownerAutoSignSendEmail,
    request_email_body: formState.requestEmailBody,
    request_email_enabled: formState.requestEmailEnabled,
    request_email_subject: formState.requestEmailSubject,
    require_email_2fa: formState.requireEmailTwoFactor,
    require_phone_2fa: formState.requirePhoneTwoFactor,
  });
}

function removeBlankPreferenceValues(
  preferences: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(preferences).filter(
      ([, value]) => !isBlankPreferenceValue(value),
    ),
  );
}

function isBlankPreferenceValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length === 0;
  }

  return value === null || value === undefined;
}

function getRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function getStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback;
}

function toDateTimeLocalValue(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? value : date.toISOString();
}
