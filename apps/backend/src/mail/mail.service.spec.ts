import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailTemplateResolver } from './mail-template-resolver.service';
import { MailService } from './mail.service';

describe('MailService', () => {
  let config: { get: jest.Mock };
  let mailer: { sendMail: jest.Mock };
  let templates: jest.Mocked<
    Pick<MailTemplateResolver, 'assertTemplateExists'>
  >;
  let service: MailService;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          MAIL_ENABLED: true,
          MAIL_FROM_NAME: 'Signa',
          MAIL_FROM_ADDRESS: 'no-reply@signa.local',
        };

        return values[key] ?? fallback;
      }),
    };
    mailer = {
      sendMail: jest.fn().mockResolvedValue({
        accepted: ['ada@example.com'],
        rejected: [],
        messageId: 'message-1',
        response: 'queued',
      }),
    };
    templates = {
      assertTemplateExists: jest.fn(),
    };
    service = new MailService(
      config as unknown as ConfigService,
      mailer as never,
      templates as unknown as MailTemplateResolver,
    );
  });

  it('sends a templated email with formatted sender and recipients', async () => {
    const result = await service.sendTemplate({
      to: { email: 'ada@example.com', name: 'Ada Lovelace' },
      subject: 'Hello',
      template: 'submitter-invitation',
      context: { accountName: 'Signa' },
    });

    expect(templates.assertTemplateExists).toHaveBeenCalledWith(
      'submitter-invitation',
    );
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Signa" <no-reply@signa.local>',
        to: ['"Ada Lovelace" <ada@example.com>'],
        subject: 'Hello',
        template: 'submitter-invitation',
      }),
    );
    expect(result).toMatchObject({
      status: 'sent',
      accepted: ['ada@example.com'],
      rejected: [],
    });
  });

  it('skips delivery when mail is disabled', async () => {
    config.get.mockImplementation((key: string, fallback?: unknown) =>
      key === 'MAIL_ENABLED' ? false : fallback,
    );

    const result = await service.sendTemplate({
      to: { email: 'ada@example.com' },
      subject: 'Hello',
      template: 'submitter-invitation',
    });

    expect(mailer.sendMail).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'skipped',
      accepted: [],
      rejected: [],
    });
  });

  it('throws when SMTP rejects recipients', async () => {
    mailer.sendMail.mockResolvedValueOnce({
      accepted: [],
      rejected: ['ada@example.com'],
    });

    await expect(
      service.sendTemplate({
        to: { email: 'ada@example.com' },
        subject: 'Hello',
        template: 'submitter-invitation',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
