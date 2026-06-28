import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { filter, interval, map, merge, Observable, Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type {
  RealtimeEvent,
  RealtimeEventInput,
  RealtimeStreamFilters,
} from './realtime.types';

const keepAliveIntervalMs = 25_000;

@Injectable()
export class RealtimeService {
  private readonly events = new Subject<RealtimeEvent>();

  publish(input: RealtimeEventInput): void {
    this.events.next({
      ...input,
      data: input.data ?? {},
      id: input.id ?? `${input.type}:${randomUUID()}`,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
    });
  }

  stream(
    accountId: string,
    filters: RealtimeStreamFilters = {},
  ): Observable<MessageEvent> {
    const accountEvents = this.events.pipe(
      filter((event) => isEventVisible(event, accountId, filters)),
      map((event) => ({
        data: event,
        id: event.id,
        type: event.type,
      })),
    );
    const keepAlive = interval(keepAliveIntervalMs).pipe(
      map(() => ({
        data: {
          account_id: accountId,
          data: {},
          id: `keepalive:${Date.now()}`,
          occurred_at: new Date().toISOString(),
          type: 'realtime.keepalive',
        } satisfies RealtimeEvent,
        type: 'realtime.keepalive',
      })),
    );

    return merge(accountEvents, keepAlive);
  }
}

function isEventVisible(
  event: RealtimeEvent,
  accountId: string,
  filters: RealtimeStreamFilters,
): boolean {
  if (event.account_id !== accountId) {
    return false;
  }

  if (filters.templateId && event.template_id !== filters.templateId) {
    return false;
  }

  if (filters.submissionId && event.submission_id !== filters.submissionId) {
    return false;
  }

  if (filters.webhookUrlId && event.webhook_url_id !== filters.webhookUrlId) {
    return false;
  }

  return true;
}
