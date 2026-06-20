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
] as const satisfies readonly AccountPreferenceDefinition[];

export const accountPreferenceKeys = accountPreferenceDefinitions.map(
  (definition) => definition.key,
);
