import { SubmissionEventLogItemDto } from './dto/submission-event-log-response.dto';
import { SubmissionEvent } from './entities/submission-event.entity';
import { Submission } from './entities/submission.entity';

type SubmitterSummary = {
  email: string | null;
  id: string;
  name: string | null;
  phone: string | null;
};

const eventIconByType: Record<string, string> = {
  api_complete_form: 'check',
  click_email: 'hand_click',
  click_sms: 'hand_click',
  complete_form: 'check',
  complete_verification: 'check',
  decline_form: 'x',
  delegate_form: 'user_share',
  email_verified: 'email_check',
  invite_party: 'user_plus',
  phone_verified: 'phone_check',
  send_2fa_email: '2fa',
  send_2fa_sms: '2fa',
  send_email: 'mail_forward',
  send_reminder_email: 'mail_forward',
  send_sms: 'send',
  start_form: 'player_play',
  start_verification: 'player_play',
  submission_created: 'file_text',
  view_form: 'eye',
};

const eventTitleByType: Record<string, string> = {
  api_complete_form: 'Submission completed',
  click_email: 'Email link opened',
  click_sms: 'SMS link opened',
  complete_form: 'Submission completed',
  complete_verification: 'Verification completed',
  decline_form: 'Submission declined',
  delegate_form: 'Submission delegated',
  email_verified: 'Email verified',
  invite_party: 'Party invited',
  phone_verified: 'Phone verified',
  send_2fa_email: '2FA email sent',
  send_2fa_sms: '2FA SMS sent',
  send_email: 'Email sent',
  send_reminder_email: 'Reminder email sent',
  send_sms: 'SMS sent',
  start_form: 'Submission started',
  start_verification: 'Verification started',
  submission_created: 'Submission created',
  view_form: 'Form viewed',
};

export function buildSubmissionEventLog(
  submission: Submission,
): SubmissionEventLogItemDto[] {
  const submittersById = new Map(
    (submission.submitters ?? []).map((submitter) => [
      submitter.id,
      {
        email: submitter.email,
        id: submitter.id,
        name: submitter.name,
        phone: submitter.phone,
      },
    ]),
  );

  return [
    buildSubmissionCreatedEvent(submission),
    ...(submission.submissionEvents ?? []).map((event) =>
      buildPersistedEvent(event, submittersById),
    ),
  ].sort(
    (first, second) =>
      first.event_timestamp.getTime() - second.event_timestamp.getTime(),
  );
}

function buildSubmissionCreatedEvent(
  submission: Submission,
): SubmissionEventLogItemDto {
  const actor = submission.createdByUser?.email ?? null;
  const source = humanizeSource(submission.source);

  return {
    id: `submission-${submission.id}-created`,
    actor,
    browser: null,
    data: { source: submission.source },
    device: null,
    event_timestamp: submission.createdAt,
    event_type: 'submission_created',
    icon: eventIconByType.submission_created,
    ip: null,
    message: actor
      ? `Submission created by ${actor} via ${source}`
      : `Submission created via ${source}`,
    os: null,
    submitter_id: null,
    timezone: null,
    title: eventTitleByType.submission_created,
  };
}

function buildPersistedEvent(
  event: SubmissionEvent,
  submittersById: Map<string, SubmitterSummary>,
): SubmissionEventLogItemDto {
  const submitter = event.submitterId
    ? submittersById.get(event.submitterId)
    : undefined;
  const actor = getEventActor(event, submitter);
  const title =
    eventTitleByType[event.eventType] ?? humanizeSource(event.eventType);

  return {
    id: event.id,
    actor,
    browser: stringOrNull(event.data?.browser),
    data: event.data ?? {},
    device:
      stringOrNull(event.data?.device_type) ?? detectDevice(event.data?.ua),
    event_timestamp: event.eventTimestamp,
    event_type: event.eventType,
    icon: eventIconByType[event.eventType] ?? 'circle_dot',
    ip: stringOrNull(event.data?.ip),
    message: buildEventMessage(event.eventType, title, actor),
    os: stringOrNull(event.data?.os),
    submitter_id: event.submitterId,
    timezone: stringOrNull(event.data?.timezone),
    title,
  };
}

function buildEventMessage(
  eventType: string,
  title: string,
  actor: string | null,
): string {
  if (!actor) {
    return title;
  }

  if (eventType.startsWith('send_')) {
    return `${title} to ${actor}`;
  }

  return `${title} by ${actor}`;
}

function getEventActor(
  event: SubmissionEvent,
  submitter: SubmitterSummary | undefined,
): string | null {
  if (typeof event.data?.phone === 'string') {
    return event.data.phone;
  }

  return submitter?.name ?? submitter?.email ?? submitter?.phone ?? null;
}

function detectDevice(ua: unknown): string | null {
  if (typeof ua !== 'string' || ua.trim() === '') {
    return null;
  }

  if (/ipad|tablet/i.test(ua)) {
    return 'tablet';
  }

  if (/mobi|android|iphone|ipod/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function humanizeSource(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
