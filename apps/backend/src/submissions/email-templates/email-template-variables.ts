export type EmailTemplateRenderContext = {
  accountName?: string | null;
  documentsLink?: string | null;
  senderEmail?: string | null;
  senderFirstName?: string | null;
  senderName?: string | null;
  submissionExpireAt?: string | null;
  submissionId?: string | null;
  submissionLink?: string | null;
  submissionName?: string | null;
  submissionSubmitters?: string | null;
  submitterEmail?: string | null;
  submitterFirstName?: string | null;
  submitterId?: string | null;
  submitterLink?: string | null;
  submitterName?: string | null;
  submitterSlug?: string | null;
  templateId?: string | null;
  templateName?: string | null;
};

const emailVariableNames = {
  accountName: 'account.name',
  documentsLink: 'documents.link',
  documentsLinks: 'documents.links',
  senderEmail: 'sender.email',
  senderFirstName: 'sender.first_name',
  senderName: 'sender.name',
  submissionExpireAt: 'submission.expire_at',
  submissionId: 'submission.id',
  submissionLink: 'submission.link',
  submissionName: 'submission.name',
  submissionSubmitters: 'submission.submitters',
  submitterEmail: 'submitter.email',
  submitterFirstName: 'submitter.first_name',
  submitterId: 'submitter.id',
  submitterLink: 'submitter.link',
  submitterName: 'submitter.name',
  submitterSlug: 'submitter.slug',
  templateId: 'template.id',
  templateName: 'template.name',
} satisfies Record<string, string>;

export const signatureRequestEmailVariables = [
  emailVariableNames.templateName,
  emailVariableNames.submitterLink,
  emailVariableNames.accountName,
] as const;

export const documentsCopyEmailVariables = [
  emailVariableNames.templateName,
  emailVariableNames.documentsLink,
  emailVariableNames.accountName,
] as const;

export const completedNotificationEmailVariables = [
  emailVariableNames.templateName,
  emailVariableNames.submissionSubmitters,
  emailVariableNames.submissionLink,
] as const;

export function replaceEmailTemplateVariables(
  markdown: string,
  context: EmailTemplateRenderContext,
): string {
  return getReplacementPairs(context).reduce(
    (nextMarkdown, [variableName, value]) =>
      nextMarkdown.replace(buildVariablePattern(variableName), value ?? ''),
    markdown,
  );
}

function getReplacementPairs(
  context: EmailTemplateRenderContext,
): Array<[string, string | null | undefined]> {
  return [
    [emailVariableNames.accountName, context.accountName],
    [emailVariableNames.documentsLink, context.documentsLink],
    [emailVariableNames.documentsLinks, context.documentsLink],
    [emailVariableNames.senderEmail, context.senderEmail],
    [emailVariableNames.senderFirstName, context.senderFirstName],
    [emailVariableNames.senderName, context.senderName],
    [emailVariableNames.submissionExpireAt, context.submissionExpireAt],
    [emailVariableNames.submissionId, context.submissionId],
    [emailVariableNames.submissionLink, context.submissionLink],
    [emailVariableNames.submissionName, context.submissionName],
    [emailVariableNames.submissionSubmitters, context.submissionSubmitters],
    ['submitters', context.submissionSubmitters],
    [emailVariableNames.submitterEmail, context.submitterEmail],
    [emailVariableNames.submitterFirstName, context.submitterFirstName],
    [emailVariableNames.submitterId, context.submitterId],
    [emailVariableNames.submitterLink, context.submitterLink],
    [emailVariableNames.submitterName, context.submitterName],
    [emailVariableNames.submitterSlug, context.submitterSlug],
    [emailVariableNames.templateId, context.templateId],
    [emailVariableNames.templateName, context.templateName],
  ];
}

function buildVariablePattern(variableName: string): RegExp {
  return new RegExp(`\\{+${escapeRegExp(variableName)}\\}+`, 'gi');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
