import { authenticatedApiFetch } from "./auth"

export const webhookEventTypes = [
  "form.viewed",
  "form.started",
  "form.completed",
  "form.declined",
  "submission.created",
  "submission.completed",
  "submission.expired",
  "submission.archived",
  "template.created",
  "template.updated",
  "template.archived",
] as const

export type WebhookEventType = (typeof webhookEventTypes)[number]

export type WebhookUrl = {
  id: string
  url: string
  events: WebhookEventType[]
  hmac_secret: string
  secret: Record<string, string>
  created_at: string
  updated_at: string
}

export type WebhookAttempt = {
  id: string
  attempt: number
  response_status_code: number
  response_body: string | null
  created_at: string
}

export type WebhookEvent = {
  id: string
  uuid: string
  event_type: WebhookEventType
  record_type: string
  record_id: string
  status: "pending" | "success" | "error"
  payload: Record<string, unknown> | null
  created_at: string
  attempts: WebhookAttempt[]
}

export type WebhookInput = {
  url: string
  events: WebhookEventType[]
}

export function listWebhooks(): Promise<{ data: WebhookUrl[] }> {
  return authenticatedApiFetch<{ data: WebhookUrl[] }>("/webhooks")
}

export function createWebhook(input: WebhookInput): Promise<WebhookUrl> {
  return authenticatedApiFetch<WebhookUrl>("/webhooks", {
    body: JSON.stringify(input),
    method: "POST",
  })
}

export function updateWebhook(
  id: string,
  input: Partial<WebhookInput>
): Promise<WebhookUrl> {
  return authenticatedApiFetch<WebhookUrl>(`/webhooks/${id}`, {
    body: JSON.stringify(input),
    method: "PATCH",
  })
}

export function deleteWebhook(id: string): Promise<WebhookUrl> {
  return authenticatedApiFetch<WebhookUrl>(`/webhooks/${id}`, {
    method: "DELETE",
  })
}

export function testWebhook(id: string): Promise<{ queued: boolean }> {
  return authenticatedApiFetch<{ queued: boolean }>(`/webhooks/${id}/test`, {
    method: "POST",
  })
}

export function listWebhookEvents(
  id: string,
  status?: WebhookEvent["status"]
): Promise<{ data: WebhookEvent[] }> {
  const params = status ? `?status=${status}` : ""

  return authenticatedApiFetch<{ data: WebhookEvent[] }>(
    `/webhooks/${id}/events${params}`
  )
}

export function resendWebhookEvent(id: string): Promise<{ queued: boolean }> {
  return authenticatedApiFetch<{ queued: boolean }>(
    `/webhook-events/${id}/resend`,
    { method: "POST" }
  )
}
