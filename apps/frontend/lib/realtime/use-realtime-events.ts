"use client";

import { useEffect, useRef } from "react";
import {
  createRealtimeEventSource,
  type RealtimeEvent,
  type RealtimeStreamOptions,
} from "@/lib/api/realtime";

type UseRealtimeEventsOptions = RealtimeStreamOptions & {
  enabled?: boolean;
  onEvent: (event: RealtimeEvent) => void;
};

export function useRealtimeEvents({
  enabled = true,
  onEvent,
  scope,
  submissionId,
  templateId,
  webhookUrlId,
}: UseRealtimeEventsOptions) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const source = createRealtimeEventSource({
      scope,
      submissionId,
      templateId,
      webhookUrlId,
    });

    if (!source) {
      return;
    }

    function handleMessage(message: MessageEvent<string>) {
      const event = parseRealtimeEvent(message.data);

      if (event && event.type !== "realtime.keepalive") {
        onEventRef.current(event);
      }
    }

    source.onmessage = handleMessage;
    source.addEventListener("realtime.keepalive", handleMessage);
    source.addEventListener("template.created", handleMessage);
    source.addEventListener("template.updated", handleMessage);
    source.addEventListener("template.archived", handleMessage);
    source.addEventListener("submission.created", handleMessage);
    source.addEventListener("submission.completed", handleMessage);
    source.addEventListener("submission.expired", handleMessage);
    source.addEventListener("submission.archived", handleMessage);
    source.addEventListener("form.viewed", handleMessage);
    source.addEventListener("form.started", handleMessage);
    source.addEventListener("form.completed", handleMessage);
    source.addEventListener("form.declined", handleMessage);
    source.addEventListener("mail.email_sent", handleMessage);
    source.addEventListener("mail.email_skipped", handleMessage);
    source.addEventListener("mail.email_failed", handleMessage);
    source.addEventListener("mail.email_reminder_sent", handleMessage);
    source.addEventListener("mail.email_2fa_sent", handleMessage);
    source.addEventListener("webhook.delivery.updated", handleMessage);

    return () => {
      source.close();
    };
  }, [enabled, scope, submissionId, templateId, webhookUrlId]);
}

function parseRealtimeEvent(value: string): RealtimeEvent | null {
  try {
    const parsed = JSON.parse(value) as RealtimeEvent;

    return typeof parsed.type === "string" ? parsed : null;
  } catch {
    return null;
  }
}
