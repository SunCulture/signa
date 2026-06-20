export const runtimeEvents = {
  formCompleted: 'form.completed',
  formDeclined: 'form.declined',
  formStarted: 'form.started',
  formViewed: 'form.viewed',
  submissionArchived: 'submission.archived',
  submissionCompleted: 'submission.completed',
  submissionCreated: 'submission.created',
  submissionExpired: 'submission.expired',
  submitterInvitationRequested: 'submitter.invitation.requested',
  submitterDocumentsCopyRequested: 'submitter.documents-copy.requested',
  submitterVerificationRequested: 'submitter.verification.requested',
  templateArchived: 'template.archived',
  templateCreated: 'template.created',
  templateUpdated: 'template.updated',
} as const;

export type RuntimeEventName =
  (typeof runtimeEvents)[keyof typeof runtimeEvents];
