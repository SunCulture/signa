import { getAuthToken } from "./auth";
import { apiUrl } from "./http";

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

export type RealtimeStreamOptions = {
  scope?: "account" | "submission" | "template" | "webhook";
  submissionId?: string;
  templateId?: string;
  webhookUrlId?: string;
};

export function createRealtimeEventSource(
  options: RealtimeStreamOptions = {},
): EventSource | null {
  const token = getAuthToken();

  if (!token) {
    return null;
  }

  const url = new URL(`${apiUrl}/realtime/stream`);

  url.searchParams.set("token", token);

  if (options.scope) {
    url.searchParams.set("scope", options.scope);
  }

  if (options.templateId) {
    url.searchParams.set("template_id", options.templateId);
  }

  if (options.submissionId) {
    url.searchParams.set("submission_id", options.submissionId);
  }

  if (options.webhookUrlId) {
    url.searchParams.set("webhook_url_id", options.webhookUrlId);
  }

  return new EventSource(url.toString());
}
