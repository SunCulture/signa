"use client"

import {
  CheckIcon,
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
import type { SubmissionEventLogItem } from "@/lib/api/submissions"
import { cn } from "@/lib/utils"

type SubmissionEventLogDialogProps = {
  events: SubmissionEventLogItem[]
  isLoading: boolean
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
  events,
  isLoading,
  onOpenChange,
  open,
}: SubmissionEventLogDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] max-w-xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Event Log</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(80vh-72px)] overflow-y-auto px-8 py-5">
          {isLoading ? (
            <div className="flex items-center gap-3 py-12 text-sm font-semibold">
              <Spinner />
              Loading events
            </div>
          ) : (
            <ol className="relative flex flex-col gap-6 border-l border-[var(--auth-input-border)]">
              {events.map((event, index) => (
                <EventLogItem event={event} index={index} key={event.id} />
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
    </li>
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

function formatEventTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
