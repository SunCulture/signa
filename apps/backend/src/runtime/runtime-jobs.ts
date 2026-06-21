export const runtimeJobNames = {
  deliverCompletedEmail: 'deliver-completed-email',
  deliverDeclinedEmail: 'deliver-declined-email',
  deliverDocumentsCopyEmail: 'deliver-documents-copy-email',
  deliverReminderEmail: 'deliver-reminder-email',
  deliverSignatureRequestEmail: 'deliver-signature-request-email',
  deliverSubmitterVerificationEmail: 'deliver-submitter-verification-email',
  deliverSubmitterSms: 'deliver-submitter-sms',
  deliverWebhook: 'deliver-webhook',
  generateAuditTrailPdf: 'generate-audit-trail-pdf',
  generateCombinedPdf: 'generate-combined-pdf',
  generateCompletedPdf: 'generate-completed-pdf',
  generatePreviewImages: 'generate-preview-images',
  processSubmissionExpiry: 'process-submission-expiry',
} as const;

export type RuntimeJobName =
  (typeof runtimeJobNames)[keyof typeof runtimeJobNames];
