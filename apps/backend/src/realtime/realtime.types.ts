export type RealtimeEvent = {
  account_id: string;
  data: Record<string, unknown>;
  id: string;
  occurred_at: string;
  record_id?: string;
  submission_id?: string;
  submitter_id?: string;
  template_id?: string;
  type: string;
  webhook_url_id?: string;
};

export type RealtimeEventInput = Omit<RealtimeEvent, 'id' | 'occurred_at'> & {
  id?: string;
  occurred_at?: string;
};

export type RealtimeStreamFilters = {
  scope?: string;
  submissionId?: string;
  templateId?: string;
  webhookUrlId?: string;
};
