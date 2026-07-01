"use client"

import {
  CheckIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  MailIcon,
  MonitorIcon,
  MousePointerClickIcon,
  PlayIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import type {
  SubmissionEventLogItem,
  SubmissionMailEventResponse,
} from "@/lib/api/submissions"
import { cn } from "@/lib/utils"

type SubmissionEventLogDialogProps = {
  auditLogUrl?: string | null
  combinedDocumentUrl?: string | null
  events: SubmissionEventLogItem[]
  isLoading: boolean
  mailEvents: SubmissionMailEventResponse[]
  onOpenChange: (open: boolean) => void
  open: boolean
}

const iconByEvent = {
  check: CheckIcon,
  eye: EyeIcon,
  file_text: FileTextIcon,
  hand_click: MousePointerClickIcon,
  mail_forward: MailIcon,
  player_play: PlayIcon,
  x: XIcon,
}

export function SubmissionEventLogDialog({
  auditLogUrl,
  combinedDocumentUrl,
  events,
  isLoading,
  mailEvents,
  onOpenChange,
  open,
}: SubmissionEventLogDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[80vh] max-w-xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Event Log</DialogTitle>
        </DialogHeader>
        {auditLogUrl || combinedDocumentUrl ? (
          <div className="flex shrink-0 flex-wrap gap-2 border-b px-6 py-3">
            {auditLogUrl ? (
              <Button asChild className="h-9 rounded-full text-xs font-bold" variant="outline">
                <a href={auditLogUrl} rel="noreferrer" target="_blank">
                  <FileTextIcon data-icon="inline-start" />
                  AUDIT LOG
                </a>
              </Button>
            ) : null}
            {combinedDocumentUrl ? (
              <Button asChild className="h-9 rounded-full text-xs font-bold" variant="outline">
                <a href={combinedDocumentUrl} rel="noreferrer" target="_blank">
                  <DownloadIcon data-icon="inline-start" />
                  COMBINED PDF
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10 pt-5">
          {isLoading ? (
            <div className="flex items-center gap-3 py-12 text-sm font-semibold">
              <Spinner />
              Loading events
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <ol className="relative flex flex-col gap-6 border-l border-[var(--auth-input-border)]">
                {events.map((event, index) => (
                  <EventLogItem event={event} index={index} key={event.id} />
                ))}
              </ol>
              <MailDeliveryTrace events={mailEvents} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MailDeliveryTrace({
  events,
}: {
  events: SubmissionMailEventResponse[]
}) {
  if (!events.length) {
    return null
  }

  return (
    <section className="border-t border-[var(--auth-input-border)] pt-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--auth-muted-foreground)]">
        Mail delivery
      </h3>
      <div className="mt-3 flex flex-col gap-3">
        {events.map((event) => (
          <div
            className="rounded-2xl border border-[var(--auth-input-border)] bg-white px-4 py-3"
            key={event.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--auth-primary)]">
                  {event.subject}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--auth-muted-foreground)]">
                  {event.recipients}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold uppercase",
                  getMailStatusClass(event.status),
                )}
              >
                {event.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--auth-muted-foreground)]">
              <span>Template: {event.template}</span>
              <span>Attempt: {event.attempt}</span>
              <span>{formatEventTime(getMailTimestamp(event))}</span>
            </div>
            {event.last_error_message ? (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-900">
                {event.last_error_message}
              </p>
            ) : null}
            {event.provider_response ? (
              <p className="mt-2 text-xs text-[var(--auth-muted-foreground)]">
                Provider response: {event.provider_response}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function EventLogItem({
  event,
  index,
}: {
  event: SubmissionEventLogItem
  index: number
}) {
  const Icon = iconByEvent[event.icon as keyof typeof iconByEvent] ?? FileTextIcon

  return (
    <li className="relative ml-7">
      <span
        className={cn(
          "absolute -left-[43px] flex size-8 items-center justify-center rounded-full ring-8 ring-popover",
          getTimelineColor(index)
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--auth-muted-foreground)]">
        <time>{formatEventTime(event.event_timestamp)}</time>
        <DeviceIcon device={event.device} />
      </div>
      <p className="mt-1 text-base text-[var(--auth-primary)]">
        <strong>{event.title}</strong>
        {event.actor ? <span> by {event.actor}</span> : null}
      </p>
      {event.message ? (
        <p className="mt-1 text-sm text-[var(--auth-muted-foreground)]">
          {event.message}
        </p>
      ) : null}
      <EventMetadata event={event} />
    </li>
  )
}

function EventMetadata({ event }: { event: SubmissionEventLogItem }) {
  const details = [
    [event.browser, event.os].filter(Boolean).join(" on "),
    event.ip ? `IP ${event.ip}` : null,
    event.timezone,
  ].filter(Boolean)

  if (!details.length) {
    return null
  }

  return (
    <p className="mt-1 text-xs text-[var(--auth-muted-foreground)]">
      {details.join(" · ")}
    </p>
  )
}

function DeviceIcon({ device }: { device: string | null }) {
  const Icon =
    device === "mobile" ? SmartphoneIcon : device === "tablet" ? TabletIcon : MonitorIcon

  if (!device) {
    return null
  }

  return (
    <span title={device}>
      <Icon className="size-4" />
    </span>
  )
}

function getTimelineColor(index: number): string {
  const colors = [
    "bg-red-200 text-red-900",
    "bg-sky-200 text-sky-900",
    "bg-emerald-200 text-emerald-900",
    "bg-yellow-200 text-yellow-900",
    "bg-purple-200 text-purple-900",
    "bg-pink-200 text-pink-900",
  ]

  return colors[index % colors.length]
}

function getMailStatusClass(status: string): string {
  if (status === "sent") {
    return "bg-emerald-100 text-emerald-900"
  }

  if (status === "failed") {
    return "bg-red-100 text-red-900"
  }

  return "bg-[var(--auth-muted)] text-[var(--auth-primary)]"
}

function getMailTimestamp(event: SubmissionMailEventResponse): string {
  return (
    event.sent_at ??
    event.failed_at ??
    event.skipped_at ??
    event.created_at
  )
}

function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
