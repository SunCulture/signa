import type { AccountPreferencesResponseDto } from './dto/account-preferences-response.dto';

export type AccountPreferenceKey = keyof AccountPreferencesResponseDto;

export type AccountPreferenceDefinition = {
  property: AccountPreferenceKey;
  key: string;
  defaultValue: unknown;
};

export const accountPreferenceDefinitions = [
  {
    property: 'receive_completed_email',
    key: 'receive_completed_email',
    defaultValue: true,
  },
  {
    property: 'bcc_emails',
    key: 'bcc_emails',
    defaultValue: '',
  },
  {
    property: 'submitter_reminders',
    key: 'submitter_reminders',
    defaultValue: {
      first_duration: null,
      second_duration: null,
      third_duration: null,
    },
  },
  {
    property: 'force_mfa',
    key: 'force_mfa',
    defaultValue: false,
  },
  {
    property: 'with_signature_id',
    key: 'with_signature_id',
    defaultValue: false,
  },
  {
    property: 'require_signing_reason',
    key: 'require_signing_reason',
    defaultValue: false,
  },
  {
    property: 'allow_typed_signature',
    key: 'allow_typed_signature',
    defaultValue: true,
  },
  {
    property: 'allow_to_resubmit',
    key: 'allow_to_resubmit',
    defaultValue: true,
  },
  {
    property: 'allow_to_decline',
    key: 'allow_to_decline',
    defaultValue: true,
  },
  {
    property: 'allow_to_delegate',
    key: 'allow_to_delegate',
    defaultValue: false,
  },
  {
    property: 'form_prefill_signature',
    key: 'form_prefill_signature',
    defaultValue: true,
  },
  {
    property: 'auto_sign_owner_enabled',
    key: 'auto_sign_owner_enabled',
    defaultValue: false,
  },
  {
    property: 'auto_sign_owner_role',
    key: 'auto_sign_owner_role',
    defaultValue: 'First Party',
  },
  {
    property: 'auto_sign_owner_send_email',
    key: 'auto_sign_owner_send_email',
    defaultValue: false,
  },
  {
    property: 'download_links_expire',
    key: 'download_links_expire',
    defaultValue: true,
  },
  {
    property: 'download_links_auth',
    key: 'download_links_auth',
    defaultValue: false,
  },
  {
    property: 'combine_pdf_result_key',
    key: 'combine_pdf_result_key',
    defaultValue: false,
  },
  {
    property: 'enforce_signing_order',
    key: 'enforce_signing_order',
    defaultValue: false,
  },
  {
    property: 'with_file_links',
    key: 'with_file_links',
    defaultValue: false,
  },
  {
    property: 'hipaa',
    key: 'hipaa',
    defaultValue: false,
  },
  {
    property: 'cfr_part_11',
    key: 'cfr_part_11',
    defaultValue: false,
  },
  {
    property: 'knowledge_based_authentication',
    key: 'knowledge_based_authentication',
    defaultValue: false,
  },
  {
    property: 'esigning_preference',
    key: 'esigning_preference',
    defaultValue: 'single',
  },
  {
    property: 'flatten_result_pdf',
    key: 'flatten_result_pdf',
    defaultValue: true,
  },
  {
    property: 'document_filename_format',
    key: 'document_filename_format',
    defaultValue: '{document.name}',
  },
  {
    property: 'submitter_invitation_email',
    key: 'submitter_invitation_email',
    defaultValue: {
      subject: 'You are invited to sign a document',
      body: `Hi there,

You have been invited to sign the "{template.name}".

[Review and Sign]({submitter.link})

Please contact us by replying to this email if you have any questions.

Thanks,
{account.name}`,
    },
  },
  {
    property: 'submitter_documents_copy_email',
    key: 'submitter_documents_copy_email',
    defaultValue: {
      subject: 'Your document copy',
      body: `Hi there,

Please check the copy of your "{template.name}" in the email attachments.
Alternatively, you can review and download your copy using the link below:

[{template.name}]({documents.link})

Thanks,
{account.name}`,
      attach_audit_log: true,
      attach_documents: true,
      enabled: true,
    },
  },
  {
    property: 'submitter_completed_email',
    key: 'submitter_completed_email',
    defaultValue: {
      subject: '{template.name} has been completed by {submission.submitters}',
      body: `Hi,

"{template.name}" has been completed by {submission.submitters}

{submission.link}`,
      attach_audit_log: true,
      attach_documents: true,
    },
  },
  {
    property: 'form_completed_message',
    key: 'form_completed_message',
    defaultValue: {},
  },
  {
    property: 'form_completed_button',
    key: 'form_completed_button',
    defaultValue: {},
  },
  {
    property: 'form_with_confetti',
    key: 'form_with_confetti',
    defaultValue: false,
  },
  {
    property: 'policy_links',
    key: 'policy_links',
    defaultValue: '',
  },
] as const satisfies readonly AccountPreferenceDefinition[];

export const accountPreferenceKeys = accountPreferenceDefinitions.map(
  (definition) => definition.key,
);
