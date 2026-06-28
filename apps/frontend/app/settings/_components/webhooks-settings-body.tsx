"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CopyIcon,
  EyeIcon,
  LockIcon,
  PlusIcon,
  RefreshCcwIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  createWebhook,
  deleteWebhook,
  listWebhookEvents,
  listWebhooks,
  resendWebhookEvent,
  testWebhook,
  updateWebhook,
  type WebhookEvent,
  type WebhookEventType,
  webhookEventTypes,
  type WebhookUrl,
} from "@/lib/api/webhooks"
import { queryKeys } from "@/lib/api/query-keys"
import { useRealtimeEvents } from "@/lib/realtime/use-realtime-events"
import { SettingsSidebar } from "./settings-sidebar"

const newWebhookId = "__new_webhook__"
const defaultWebhookEvents = webhookEventTypes.filter((eventType) =>
  eventType.startsWith("form.")
)

export function WebhooksSettingsBody() {
  return (
    <div className="flex w-full flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Webhooks" />
      <WebhooksPanel />
    </div>
  )
}

function WebhooksPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const webhooksQuery = useQuery({
    queryKey: queryKeys.webhooks.list(),
    queryFn: listWebhooks,
  })
  const webhooks = webhooksQuery.data?.data ?? []
  const isCreating = selectedId === newWebhookId || webhooks.length === 0
  const selectedWebhook = isCreating
    ? null
    : webhooks.find((webhook) => webhook.id === selectedId) ?? webhooks[0] ?? null
  const selectedEventsWebhook =
    webhooks.find((webhook) => webhook.id === selectedId) ?? webhooks[0] ?? null

  useRealtimeEvents({
    enabled: Boolean(selectedEventsWebhook),
    onEvent: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.webhooks.all,
      })
    },
    scope: "webhook",
    webhookUrlId: selectedEventsWebhook?.id,
  })

  return (
    <section className="min-w-0 flex-1 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold tracking-normal">Webhook</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <span>Test mode</span>
            <Switch />
          </label>
          {webhooks.length > 0 ? (
            <Button
              className="h-11 rounded-full px-5"
              onClick={() => setSelectedId(newWebhookId)}
              type="button"
              variant="outline"
            >
              <PlusIcon data-icon="inline-start" />
              New Webhook
            </Button>
          ) : null}
        </div>
      </div>

      {webhooks.length > 1 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {webhooks.map((webhook) => (
            <button
              className={
                webhook.id === selectedWebhook?.id
                  ? "rounded-full bg-[var(--auth-primary)] px-4 py-2 text-sm font-bold text-[var(--auth-primary-foreground)]"
                  : "rounded-full border border-border px-4 py-2 text-sm font-bold"
              }
              key={webhook.id}
              onClick={() => setSelectedId(webhook.id)}
              type="button"
            >
              {getWebhookHost(webhook.url)}
            </button>
          ))}
        </div>
      ) : null}

      <WebhookForm
        key={selectedWebhook?.id ?? "new-webhook"}
        selectedWebhook={selectedWebhook}
        onSaved={(webhook) => {
          queryClient.setQueryData<{ data: WebhookUrl[] }>(
            queryKeys.webhooks.list(),
            (current) => ({
              data: upsertWebhook(current?.data ?? [], webhook),
            })
          )
          setSelectedId(webhook.id)
        }}
        onDeleted={(webhookId) => {
          queryClient.setQueryData<{ data: WebhookUrl[] }>(
            queryKeys.webhooks.list(),
            (current) => ({
              data: (current?.data ?? []).filter(
                (webhook) => webhook.id !== webhookId
              ),
            })
          )
          setSelectedId(null)
        }}
      />

      {webhooksQuery.isError ? (
        <p className="mt-4 text-sm text-destructive">
          Webhooks could not be loaded.
        </p>
      ) : null}
      <WebhookExample webhook={selectedWebhook} />
      <WebhookEventsPanel webhook={selectedEventsWebhook} />
    </section>
  )
}

function WebhookForm({
  onDeleted,
  onSaved,
  selectedWebhook,
}: {
  onDeleted: (webhookId: string) => void
  onSaved: (webhook: WebhookUrl) => void
  selectedWebhook: WebhookUrl | null
}) {
  const [url, setUrl] = useState(selectedWebhook?.url ?? "")
  const [events, setEvents] = useState<WebhookEventType[]>(
    selectedWebhook?.events ?? [...defaultWebhookEvents]
  )
  const [isSaving, setIsSaving] = useState(false)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)

    try {
      const webhook = selectedWebhook
        ? await updateWebhook(selectedWebhook.id, { events, url })
        : await createWebhook({ events, url })
      onSaved(webhook)
      toast.success("Webhook saved")
    } catch (error) {
      toast.error("Webhook could not be saved", {
        description: getErrorMessage(error),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="mt-5 rounded-2xl bg-[var(--auth-muted)] px-5 py-5"
      onSubmit={save}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <Label className="text-sm font-bold">Webhook URL</Label>
        {selectedWebhook ? (
          <div className="flex flex-wrap gap-2">
            <WebhookSecret webhook={selectedWebhook} />
            <WebhookActions webhook={selectedWebhook} onDeleted={onDeleted} />
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-col gap-2 md:flex-row">
        <Input
          className="h-12 min-w-0 flex-1 rounded-full bg-background font-mono"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/hook"
          required
          type="url"
          value={url}
        />
        <Button
          className="h-12 rounded-full px-10 md:min-w-32"
          disabled={isSaving}
        >
          {isSaving ? "SAVING..." : "SAVE"}
        </Button>
      </div>
      <EventSwitches events={events} onChange={setEvents} />
    </form>
  )
}

function EventSwitches({
  events,
  onChange,
}: {
  events: WebhookEventType[]
  onChange: (events: WebhookEventType[]) => void
}) {
  return (
    <div className="mt-5 space-y-4">
      {chunkEvents().map((eventGroup, index) => (
        <div
          className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4"
          key={index}
        >
          {eventGroup.map((eventType) => (
            <label
              className="flex min-h-6 cursor-pointer items-center gap-2 text-[15px]"
              key={eventType}
            >
              <Checkbox
                checked={events.includes(eventType)}
                className="size-5 border-border data-checked:border-[var(--auth-primary)] data-checked:bg-[var(--auth-primary)]"
                onCheckedChange={(checked) =>
                  onChange(toggleEvent(events, eventType, checked === true))
                }
              />
              <span>{eventType}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

function WebhookExample({ webhook }: { webhook: WebhookUrl | null }) {
  const example = useMemo(
    () =>
      formatJson({
        event_type: "form.completed",
        timestamp: new Date("2026-06-20T11:54:17.000Z").toISOString(),
        data: {
          id: 10028203,
          email: "omondicedo@gmail.com",
          phone: null,
          name: null,
          ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          ip: "41.90.140.174",
          sent_at: null,
          opened_at: "2026-05-15T08:38:40.404Z",
          declined_at: null,
          completed_at: "2026-05-15T08:39:43.060Z",
          created_at: "2026-05-15T08:38:40.407Z",
          updated_at: "2026-05-15T08:39:43.062Z",
          external_id: null,
          metadata: {},
          status: "completed",
          application_key: null,
          decline_reason: null,
          preferences: {
            send_email: false,
            send_sms: false,
          },
          values: [
            { field: "Full Name", value: "Cedrouseroll Omondi" },
            { field: "Date Field 1", value: "2026-05-15" },
          ],
        },
      }),
    []
  )

  return (
    <section className="mt-5 rounded-2xl bg-[var(--auth-muted)] px-5 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-normal">Webhook Example</h2>
        {webhook?.url && webhook.events.includes("form.completed") ? (
          <Button
            className="h-10 rounded-full px-5"
            onClick={() => testWebhook(webhook.id)}
            type="button"
            variant="outline"
          >
            <SendIcon data-icon="inline-start" />
            Test Webhook
          </Button>
        ) : null}
      </div>
      <CodeBlock code={example} />
    </section>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--auth-primary)] text-[var(--auth-primary-foreground)]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-white/25" />
          <span className="size-3 rounded-full bg-white/25" />
          <span className="size-3 rounded-full bg-white/25" />
        </div>
        <Button
          className="h-9 rounded-full px-4 text-[var(--auth-primary-foreground)] hover:bg-white/10"
          onClick={() => copyText(code, "Webhook example copied")}
          type="button"
          variant="ghost"
        >
          <CopyIcon data-icon="inline-start" />
          Copy
        </Button>
      </div>
      <pre className="max-h-[540px] overflow-auto px-7 pb-7 font-mono text-sm leading-7 text-[#c3d981]">
        {code}
      </pre>
    </div>
  )
}

function chunkEvents(): WebhookEventType[][] {
  return [
    webhookEventTypes.filter((eventType) => eventType.startsWith("form.")),
    webhookEventTypes.filter((eventType) => eventType.startsWith("submission.")),
    webhookEventTypes.filter((eventType) => eventType.startsWith("template.")),
  ]
}

function WebhookEventsPanel({ webhook }: { webhook: WebhookUrl | null }) {
  const [status, setStatus] = useState<WebhookEvent["status"] | undefined>()
  const eventsQuery = useQuery({
    queryKey: queryKeys.webhooks.events(webhook?.id ?? "none", status ?? "all"),
    queryFn: () => listWebhookEvents(webhook?.id ?? "", status),
    enabled: Boolean(webhook),
  })
  const visibleEvents = webhook ? (eventsQuery.data?.data ?? []) : []

  if (!webhook && !status) {
    return null
  }

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <h2 className="pb-3 text-3xl font-bold tracking-normal">Event Log</h2>
        <div className="flex gap-1">
          {[
            ["all", undefined],
            ["succeeded", "success"],
            ["failed", "error"],
            ["pending", "pending"],
          ].map(([label, value]) => (
            <button
              className={
                status === value
                  ? "border-b-2 border-[var(--auth-primary)] px-4 py-2 font-bold"
                  : "px-4 py-2 font-medium text-muted-foreground"
              }
              key={label}
              onClick={() => setStatus(value as WebhookEvent["status"])}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-b-2xl">
        {eventsQuery.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading...</p>
        ) : eventsQuery.isError ? (
          <p className="p-4 text-sm text-destructive">
            Webhook events could not be loaded.
          </p>
        ) : visibleEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            There are no events.
          </p>
        ) : (
          visibleEvents.map((event) => (
            <WebhookEventRow event={event} key={event.id} />
          ))
        )}
      </div>
    </section>
  )
}

function WebhookSecret({ webhook }: { webhook: WebhookUrl }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-9 rounded-full px-4" type="button" variant="outline">
          <LockIcon data-icon="inline-start" />
          Security
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook Security</DialogTitle>
          <DialogDescription>
            Use this HMAC secret to verify Signa webhook requests.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>HMAC secret</Label>
          <div className="flex gap-2">
            <Input
              className="h-11 min-w-0 rounded-full font-mono text-xs"
              readOnly
              value={webhook.hmac_secret}
            />
            <Button
              className="h-11 rounded-full px-4"
              onClick={() => copySecret(webhook.hmac_secret)}
              type="button"
              variant="outline"
            >
              <CopyIcon data-icon="inline-start" />
              Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function WebhookActions({
  onDeleted,
  webhook,
}: {
  onDeleted: (webhookId: string) => void
  webhook: WebhookUrl
}) {
  async function sendTest() {
    try {
      await testWebhook(webhook.id)
      toast.success("Test webhook queued")
    } catch (error) {
      toast.error("Test webhook could not be queued", {
        description: getErrorMessage(error),
      })
    }
  }

  async function remove() {
    try {
      await deleteWebhook(webhook.id)
      onDeleted(webhook.id)
      toast.success("Webhook deleted")
    } catch (error) {
      toast.error("Webhook could not be deleted", {
        description: getErrorMessage(error),
      })
    }
  }

  return (
    <>
      <Button
        className="h-12 rounded-full px-5"
        onClick={sendTest}
        type="button"
        variant="outline"
      >
        <SendIcon data-icon="inline-start" />
        Test
      </Button>
      <Button
        className="h-12 rounded-full px-5"
        onClick={remove}
        type="button"
        variant="outline"
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </Button>
    </>
  )
}

function WebhookEventRow({ event }: { event: WebhookEvent }) {
  const lastAttempt = event.attempts.at(0)

  async function resend() {
    try {
      await resendWebhookEvent(event.id)
      toast.success("Webhook resend queued")
    } catch (error) {
      toast.error("Webhook could not be resent", {
        description: getErrorMessage(error),
      })
    }
  }

  return (
    <div className="grid gap-2 border-b border-border p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{event.event_type}</p>
          <p className="text-xs text-muted-foreground">
            {event.record_type} #{event.record_id} ·{" "}
            {new Date(event.created_at).toLocaleString()}
          </p>
        </div>
        <span className="rounded-full bg-[var(--auth-muted)] px-3 py-1 text-xs font-bold">
          {event.status}
        </span>
      </div>
      {lastAttempt ? (
        <p className="rounded-xl bg-[var(--auth-muted)] px-3 py-2 text-xs">
          Last attempt: HTTP {lastAttempt.response_status_code}
          {lastAttempt.response_body
            ? ` · ${lastAttempt.response_body}`
            : ""}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <WebhookEventDetails event={event} onResend={resend} />
        <Button
          className="h-9 w-fit rounded-full px-4"
          onClick={resend}
          type="button"
          variant="outline"
        >
          <RefreshCcwIcon data-icon="inline-start" />
          Resend
        </Button>
      </div>
    </div>
  )
}

function WebhookEventDetails({
  event,
  onResend,
}: {
  event: WebhookEvent
  onResend: () => Promise<void>
}) {
  const payload = formatJson(event.payload)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="h-9 w-fit rounded-full px-4" variant="outline">
          <EyeIcon data-icon="inline-start" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{event.event_type}</DialogTitle>
          <DialogDescription>
            {event.record_type} #{event.record_id} ·{" "}
            {new Date(event.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[calc(85vh-88px)] gap-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">Payload</h3>
              <Button
                className="h-9 rounded-full px-4"
                onClick={() => copyText(payload, "Webhook payload copied")}
                type="button"
                variant="outline"
              >
                <CopyIcon data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-2xl bg-[var(--auth-primary)] p-4 text-xs leading-relaxed text-[var(--auth-primary-foreground)]">
              {payload}
            </pre>
          </div>

          <div className="grid gap-2">
            <h3 className="font-bold">Delivery attempts</h3>
            {event.attempts.length === 0 ? (
              <p className="rounded-2xl bg-[var(--auth-muted)] px-4 py-3 text-sm text-muted-foreground">
                No delivery attempt has been recorded yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                {event.attempts.map((attempt) => (
                  <div
                    className="grid gap-2 border-b border-border p-4 last:border-b-0"
                    key={attempt.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">Attempt {attempt.attempt}</p>
                      <span className="rounded-full bg-[var(--auth-muted)] px-3 py-1 text-xs font-bold">
                        HTTP {attempt.response_status_code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.created_at).toLocaleString()}
                    </p>
                    {attempt.response_body ? (
                      <pre className="max-h-40 overflow-auto rounded-xl bg-[var(--auth-muted)] p-3 text-xs">
                        {attempt.response_body}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              className="h-11 rounded-full px-5"
              onClick={onResend}
              type="button"
              variant="outline"
            >
              <RefreshCcwIcon data-icon="inline-start" />
              Resend
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function toggleEvent(
  events: WebhookEventType[],
  eventType: WebhookEventType,
  checked: boolean
): WebhookEventType[] {
  return checked
    ? Array.from(new Set([...events, eventType]))
    : events.filter((item) => item !== eventType)
}

function upsertWebhook(webhooks: WebhookUrl[], webhook: WebhookUrl): WebhookUrl[] {
  const exists = webhooks.some((item) => item.id === webhook.id)
  return exists
    ? webhooks.map((item) => (item.id === webhook.id ? webhook : item))
    : [webhook, ...webhooks]
}

async function copySecret(secret: string) {
  await copyText(secret, "Webhook secret copied")
}

async function copyText(value: string, message: string) {
  await navigator.clipboard.writeText(value)
  toast.success(message)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again."
}

function getWebhookHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function formatJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2)
}
