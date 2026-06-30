import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountConfig } from '../accounts/entities/account-config.entity';
import { StorageService } from '../storage/storage.service';
import { buildSubmitterEventTrackingParam } from '../submissions/submission-event-tracking';
import { Submitter } from '../submitters/entities/submitter.entity';
import { User } from '../users/entities/user.entity';
import { accountMailConfigKeys } from './mail-config-keys';
import { MailBrandingService } from './mail-branding.service';
import { MailTemplateResolver } from './mail-template-resolver.service';
import type {
  MailAddress,
  MailAttachment,
  SendTemplateMailInput,
} from './mail.types';

const maxAttachmentBytes = 10 * 1024 * 1024;

@Injectable()
export class MailDeliveryBuilder {
  constructor(
    @InjectRepository(AccountConfig)
    private readonly accountConfigs: Repository<AccountConfig>,
    private readonly branding: MailBrandingService,
    private readonly storage: StorageService,
    private readonly templates: MailTemplateResolver,
    private readonly config: ConfigService,
  ) {}

  async buildInvitation(
    submitter: Submitter,
  ): Promise<SendTemplateMailInput | null> {
    if (!submitter.email || !canInviteSubmitter(submitter)) {
      return null;
    }

    const context = this.buildSubmitterContext(submitter, {
      trackEmailClick: true,
    });
    const accountConfig = await this.getAccountConfigValue(
      submitter.accountId,
      accountMailConfigKeys.submitterInvitationEmail,
    );
    const templatePreferences =
      submitter.submission.template?.preferences ?? {};
    const templateSubmitterPreferences = findTemplateSubmitterPreferences(
      templatePreferences,
      submitter.uuid,
    );
    const submitterMessage = isRecord(submitter.preferences.message)
      ? submitter.preferences.message
      : {};
    const customBody =
      stringValue(submitter.preferences.request_email_body) ??
      stringValue(submitterMessage.body) ??
      stringValue(templateSubmitterPreferences?.request_email_body) ??
      stringValue(templatePreferences.request_email_body) ??
      stringValue(accountConfig?.body);
    const customSubject =
      stringValue(submitter.preferences.request_email_subject) ??
      stringValue(submitterMessage.subject) ??
      stringValue(templateSubmitterPreferences?.request_email_subject) ??
      stringValue(templatePreferences.request_email_subject) ??
      stringValue(accountConfig?.subject);
    const defaultTemplate = this.templates.renderDefault(
      'submitter-invitation',
      context,
    );
    const custom = this.templates.renderCustom(customBody, context);
    const subject = customSubject
      ? this.templates.renderCustom(customSubject, context)?.markdown
      : defaultTemplate.subject;

    return {
      accountId: submitter.accountId,
      locale: submitter.account?.locale,
      to: this.submitterAddress(submitter),
      subject: subject ?? defaultTemplate.subject,
      template: 'submitter-invitation',
      replyTo: this.buildReplyTo(submitter, accountConfig),
      context: {
        ...this.branding.getBaseContext(),
        ...context,
        actionLabel: submitterHasSignatureFields(submitter)
          ? 'Review and Sign'
          : 'Review and Submit',
        actionUrl: context.submitterLink,
        contentHtml: custom?.contentHtml ?? defaultTemplate.contentHtml,
        headline: submitterHasSignatureFields(submitter)
          ? 'You are invited to sign a document'
          : 'You are invited to submit a form',
        preheader: defaultTemplate.subject,
        recipientName: context.submitterFirstName ?? 'there',
        subject: subject ?? defaultTemplate.subject,
      },
    };
  }

  async buildInvitationReminder(
    submitter: Submitter,
  ): Promise<SendTemplateMailInput | null> {
    if (!submitter.email || !canInviteSubmitter(submitter)) {
      return null;
    }

    const context = this.buildSubmitterContext(submitter, {
      trackEmailClick: true,
    });
    const accountConfig = await this.getAccountConfigValue(
      submitter.accountId,
      accountMailConfigKeys.submitterInvitationReminderEmail,
    );
    const templatePreferences =
      submitter.submission.template?.preferences ?? {};
    const defaultTemplate = this.templates.renderDefault(
      'submitter-invitation-reminder',
      context,
    );
    const custom = this.templates.renderCustom(
      stringValue(templatePreferences.invitation_reminder_email_body) ??
        stringValue(accountConfig?.body),
      context,
    );
    const customSubject =
      stringValue(templatePreferences.invitation_reminder_email_subject) ??
      stringValue(accountConfig?.subject);
    const subject = customSubject
      ? this.templates.renderCustom(customSubject, context)?.markdown
      : defaultTemplate.subject;

    return {
      accountId: submitter.accountId,
      locale: submitter.account?.locale,
      to: this.submitterAddress(submitter),
      subject: subject ?? defaultTemplate.subject,
      template: 'submitter-invitation-reminder',
      replyTo: this.buildReplyTo(submitter, accountConfig),
      context: {
        ...this.branding.getBaseContext(),
        ...context,
        actionLabel: submitterHasSignatureFields(submitter)
          ? 'Review and Sign'
          : 'Review and Submit',
        actionUrl: context.submitterLink,
        contentHtml: custom?.contentHtml ?? defaultTemplate.contentHtml,
        headline: 'Reminder to sign',
        preheader: subject ?? defaultTemplate.subject,
        recipientName: context.submitterFirstName ?? 'there',
        subject: subject ?? defaultTemplate.subject,
      },
    };
  }

  buildVerification(
    submitter: Submitter,
    otpCode: string,
  ): SendTemplateMailInput | null {
    if (!submitter.email) {
      return null;
    }

    const context = this.buildSubmitterContext(submitter);

    return {
      accountId: submitter.accountId,
      locale: submitter.account?.locale,
      to: this.submitterAddress(submitter),
      subject: 'Email verification',
      template: 'submitter-otp-verification',
      context: {
        ...this.branding.getBaseContext(),
        ...context,
        otpCode,
        subject: 'Email verification',
      },
    };
  }

  async buildCompletedNotifications(
    submitter: Submitter,
  ): Promise<SendTemplateMailInput[]> {
    const submission = submitter.submission;
    const recipient = submission.createdByUser;

    if (!recipient?.email || submission.preferences?.send_email === false) {
      return [];
    }

    if (
      submission.template?.preferences?.completed_notification_email_enabled ===
      false
    ) {
      return [];
    }

    const context = this.buildSubmitterContext(submitter);
    const accountConfig = await this.getAccountConfigValue(
      submitter.accountId,
      accountMailConfigKeys.submitterCompletedEmail,
    );
    const templatePreferences = submission.template?.preferences ?? {};
    const customBody =
      stringValue(templatePreferences.completed_notification_email_body) ??
      stringValue(accountConfig?.body);
    const customSubject =
      stringValue(templatePreferences.completed_notification_email_subject) ??
      stringValue(accountConfig?.subject);
    const defaultTemplate = this.templates.renderDefault(
      'submitter-completed',
      context,
    );
    const custom = this.templates.renderCustom(customBody, context);
    const subject = customSubject
      ? this.templates.renderCustom(customSubject, context)?.markdown
      : defaultTemplate.subject;
    const attachments = await this.buildCompletedAttachments(submitter, {
      attachDocuments:
        templatePreferences.completed_notification_email_attach_documents !==
          false && accountConfig?.attach_documents !== false,
      attachAuditLog:
        templatePreferences.completed_notification_email_attach_audit !==
          false && accountConfig?.attach_audit_log !== false,
    });

    return [
      {
        accountId: submitter.accountId,
        locale: submitter.account?.locale,
        to: userAddress(recipient),
        subject: subject ?? defaultTemplate.subject,
        template: 'submitter-completed',
        attachments,
        context: {
          ...this.branding.getBaseContext(),
          ...context,
          contentHtml: custom?.contentHtml ?? defaultTemplate.contentHtml,
          headline: 'Document completed',
          preheader: subject ?? defaultTemplate.subject,
          subject: subject ?? defaultTemplate.subject,
        },
      },
    ];
  }

  async buildDocumentsCopy(
    submitter: Submitter,
  ): Promise<SendTemplateMailInput[]> {
    const accountConfig = await this.getAccountConfigValue(
      submitter.accountId,
      accountMailConfigKeys.submitterDocumentsCopyEmail,
    );

    if (accountConfig?.enabled === false) {
      return [];
    }

    const recipients = (submitter.submission.submitters ?? [])
      .filter((item) => item.email && item.preferences?.send_email !== false)
      .sort((a, b) => Number(a.completedAt) - Number(b.completedAt))
      .map((item) => this.submitterAddress(item));

    if (recipients.length === 0) {
      return [];
    }

    const context = this.buildSubmitterContext(submitter);
    const templatePreferences =
      submitter.submission.template?.preferences ?? {};
    const customBody =
      stringValue(templatePreferences.documents_copy_email_body) ??
      stringValue(accountConfig?.body);
    const customSubject =
      stringValue(templatePreferences.documents_copy_email_subject) ??
      stringValue(accountConfig?.subject);
    const defaultTemplate = this.templates.renderDefault(
      'submitter-documents-copy',
      context,
    );
    const custom = this.templates.renderCustom(customBody, context);
    const subject = customSubject
      ? this.templates.renderCustom(customSubject, context)?.markdown
      : defaultTemplate.subject;
    const attachments = await this.buildCompletedAttachments(submitter, {
      attachDocuments:
        templatePreferences.documents_copy_email_attach_documents !== false &&
        accountConfig?.attach_documents !== false,
      attachAuditLog:
        templatePreferences.documents_copy_email_attach_audit !== false &&
        accountConfig?.attach_audit_log !== false,
    });
    const input: SendTemplateMailInput = {
      accountId: submitter.accountId,
      locale: submitter.account?.locale,
      to: recipients,
      subject: subject ?? defaultTemplate.subject,
      template: 'submitter-documents-copy',
      replyTo: this.buildReplyTo(submitter, accountConfig),
      attachments,
      context: {
        ...this.branding.getBaseContext(),
        ...context,
        contentHtml: custom?.contentHtml ?? defaultTemplate.contentHtml,
        preheader: subject ?? defaultTemplate.subject,
        subject: subject ?? defaultTemplate.subject,
      },
    };

    if (accountConfig?.bcc_recipients === true) {
      return recipients.map((to) => ({ ...input, to }));
    }

    return [input];
  }

  buildDeclined(
    submitter: Submitter,
    reason?: string | null,
  ): SendTemplateMailInput[] {
    const recipient = submitter.submission.createdByUser;

    if (!recipient?.email) {
      return [];
    }

    const context = this.buildSubmitterContext(submitter);
    const subject = `${context.templateName} has been declined by ${context.submitterName}`;

    return [
      {
        accountId: submitter.accountId,
        locale: submitter.account?.locale,
        to: userAddress(recipient),
        subject,
        template: 'submitter-declined',
        replyTo: this.submitterAddress(submitter),
        context: {
          ...this.branding.getBaseContext(),
          ...context,
          declineReason: reason,
          subject,
        },
      },
    ];
  }

  private buildSubmitterContext(
    submitter: Submitter,
    options: { trackEmailClick?: boolean } = {},
  ) {
    const submission = submitter.submission;
    const templateName =
      submission.name ?? submission.template?.name ?? 'Document';
    const submitterName =
      submitter.name ?? submitter.email ?? submitter.phone ?? 'submitter';

    const submitterLink = options.trackEmailClick
      ? this.buildTrackedSubmitterLink(submitter)
      : this.branding.getFrontendUrl(`/s/${submitter.slug}`);
    const submissionLink = this.branding.getFrontendUrl(
      `/submissions/${submission.id}`,
    );

    return {
      accountName: submitter.account?.name ?? 'Signa',
      documentsLink: submitterLink,
      documentsUrl: submitterLink,
      senderEmail: submission.createdByUser?.email ?? null,
      senderFirstName: submission.createdByUser?.firstName ?? null,
      senderName: fullName(submission.createdByUser),
      submissionExpireAt: submission.expireAt?.toISOString() ?? null,
      submissionId: submission.id,
      submissionLink,
      submissionName: submission.name,
      submissionSubmitters: formatSubmitterNames(submission.submitters ?? []),
      submissionUrl: submissionLink,
      submitterEmail: submitter.email,
      submitterFirstName: firstName(submitter.name),
      submitterId: submitter.id,
      submitterLink,
      submitterName,
      submitterSlug: submitter.slug,
      templateId: submission.templateId,
      templateName,
    };
  }

  private buildTrackedSubmitterLink(submitter: Submitter): string {
    const url = new URL(this.branding.getFrontendUrl(`/s/${submitter.slug}`));
    const trackingParam = buildSubmitterEventTrackingParam({
      eventType: 'click_email',
      secret: this.config.get<string>('JWT_SECRET', 'signa-development-secret'),
      submitterSlug: submitter.slug,
    });

    url.searchParams.set('t', trackingParam);

    return url.toString();
  }

  private async buildCompletedAttachments(
    submitter: Submitter,
    options: { attachAuditLog: boolean; attachDocuments: boolean },
  ): Promise<MailAttachment[]> {
    const attachments: MailAttachment[] = [];
    let totalBytes = 0;

    if (options.attachDocuments) {
      const documents = await this.storage.findRecordAttachments({
        recordType: 'Submitter',
        recordId: submitter.id,
        name: 'documents',
      });

      for (const document of documents) {
        const nextBytes = Number(document.blob.byteSize ?? 0);

        if (totalBytes + nextBytes > maxAttachmentBytes) {
          break;
        }

        totalBytes += nextBytes;
        attachments.push({
          filename: document.blob.filename,
          content: await this.storage.readBlob(document.blob),
          contentType: document.blob.contentType ?? undefined,
        });
      }
    }

    if (options.attachAuditLog) {
      const [auditTrail] = await this.storage.findRecordAttachments({
        recordType: 'Submission',
        recordId: submitter.submissionId,
        name: 'audit_trail',
      });

      if (auditTrail) {
        const nextBytes = Number(auditTrail.blob.byteSize ?? 0);

        if (totalBytes + nextBytes <= maxAttachmentBytes) {
          attachments.push({
            filename: auditTrail.blob.filename,
            content: await this.storage.readBlob(auditTrail.blob),
            contentType: auditTrail.blob.contentType ?? undefined,
          });
        }
      }
    }

    return attachments;
  }

  private async getAccountConfigValue(
    accountId: string,
    key: string,
  ): Promise<Record<string, unknown> | null> {
    const config = await this.accountConfigs.findOne({
      where: { accountId, key },
    });

    return isRecord(config?.value) ? config.value : null;
  }

  private buildReplyTo(
    submitter: Submitter,
    accountConfig: Record<string, unknown> | null,
  ): MailAddress | string | null {
    const configured =
      stringValue(submitter.preferences.reply_to) ??
      stringValue(accountConfig?.reply_to);

    if (configured && !/no-?reply@/i.test(configured)) {
      return configured;
    }

    const sender = submitter.submission.createdByUser;

    if (sender?.email && sender.email !== submitter.email) {
      return userAddress(sender);
    }

    return null;
  }

  private submitterAddress(submitter: Submitter): MailAddress {
    return {
      email: submitter.email ?? '',
      name: submitter.name,
    };
  }
}

function canInviteSubmitter(submitter: Submitter): boolean {
  return (
    !submitter.completedAt &&
    !submitter.declinedAt &&
    !submitter.submission.archivedAt &&
    !submitter.submission.template?.archivedAt &&
    submitter.preferences?.send_email !== false
  );
}

function submitterHasSignatureFields(submitter: Submitter): boolean {
  const fields =
    submitter.submission.templateFields ??
    submitter.submission.template?.fields ??
    [];

  return fields.some(
    (field) =>
      field.submitter_uuid === submitter.uuid &&
      ['signature', 'initials'].includes(String(field.type)),
  );
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function findTemplateSubmitterPreferences(
  templatePreferences: Record<string, unknown>,
  submitterUuid: string,
): Record<string, unknown> | null {
  const submitters = templatePreferences.submitters;

  if (!Array.isArray(submitters)) {
    return null;
  }

  const match = (submitters as unknown[]).find(
    (item) => isRecord(item) && item.uuid === submitterUuid,
  );

  return isRecord(match) ? match : null;
}

function userAddress(user: User): MailAddress {
  return {
    email: user.email,
    name: fullName(user),
  };
}

function fullName(user: User | null | undefined): string | null {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null;
}

function firstName(value: string | null | undefined): string | null {
  return value?.trim().split(/\s+/)[0] ?? null;
}

function formatSubmitterNames(submitters: Submitter[]): string {
  return submitters
    .filter((submitter) => submitter.completedAt)
    .map((submitter) => submitter.name ?? submitter.email ?? submitter.phone)
    .filter((value): value is string => !!value)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ');
}
