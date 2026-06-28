import { ConfigService } from '@nestjs/config';
import { mailTemplateKeys, mailTemplateNames } from './mail.types';
import { MailTemplateResolver } from './mail-template-resolver.service';

describe('MailTemplateResolver', () => {
  let resolver: MailTemplateResolver;

  beforeEach(() => {
    resolver = new MailTemplateResolver({
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    } as unknown as ConfigService);
  });

  it.each(mailTemplateNames)('finds the %s handlebars template', (template) => {
    expect(() => resolver.assertTemplateExists(template)).not.toThrow();
  });

  it.each(mailTemplateKeys)(
    'renders the %s configurable default template',
    (template) => {
      const result = resolver.renderDefault(template, {
        accountName: 'Ada Labs',
        documentsLink: 'https://example.test/documents',
        senderEmail: 'grace@example.com',
        senderFirstName: 'Grace',
        senderName: 'Grace Hopper',
        submissionExpireAt: null,
        submissionId: '1',
        submissionLink: 'https://example.test/submissions/1',
        submissionName: 'NDA',
        submissionSubmitters: 'Ada Lovelace',
        submitterEmail: 'ada@example.com',
        submitterFirstName: 'Ada',
        submitterId: '1',
        submitterLink: 'https://example.test/s/slug',
        submitterName: 'Ada Lovelace',
        submitterSlug: 'slug',
        templateId: '1',
        templateName: 'NDA',
      });

      expect(result.subject).toBeTruthy();
      expect(result.markdown).toBeTruthy();
      expect(result.contentHtml).toBeTruthy();
    },
  );
});
