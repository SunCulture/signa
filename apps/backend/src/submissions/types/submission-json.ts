import type {
  TemplateField,
  TemplatePreferences,
  TemplateSchemaItem,
  TemplateSubmitter,
  TemplateVariablesSchema,
} from '../../templates/types/template-json';

export type SubmissionPreferences = TemplatePreferences & {
  send_email?: boolean;
  send_sms?: boolean;
  bcc_completed?: string;
  completed_redirect_url?: string;
  reply_to?: string;
};

export type SubmitterPreferences = TemplatePreferences & {
  send_email?: boolean;
  send_sms?: boolean;
  completed_redirect_url?: string;
  reply_to?: string;
  default_values?: Record<string, unknown>;
};

export type SubmitterMetadata = Record<string, unknown>;
export type SubmitterValues = Record<string, unknown>;

export type SubmissionEventData = Record<string, unknown>;

export type SubmissionVariables = Record<string, unknown>;

export type SubmissionTemplateField = TemplateField;
export type SubmissionTemplateSchemaItem = TemplateSchemaItem;
export type SubmissionTemplateSubmitter = TemplateSubmitter;
export type SubmissionVariablesSchema = TemplateVariablesSchema;
