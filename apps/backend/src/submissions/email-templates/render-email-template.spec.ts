import { renderEmailTemplate } from './render-email-template';

describe('renderEmailTemplate', () => {
  it('replaces DocuSeal-style single and double brace variables', () => {
    const result = renderEmailTemplate(
      'Hi {submitter.name}, sign {{template.name}} for {account.name}.',
      {
        accountName: 'Signa Inc.',
        submitterName: 'Ada',
        templateName: 'NDA',
      },
    );

    expect(result.markdown).toBe('Hi Ada, sign NDA for Signa Inc..');
  });

  it('renders sanitized Markdown email HTML', () => {
    const result = renderEmailTemplate(
      [
        'Hi **Ada**,',
        '',
        'Please [Review and Sign]({submitter.link})',
        '',
        '++Thanks++,',
        '{account.name}<script>alert(1)</script>',
      ].join('\n'),
      {
        accountName: 'Signa Inc.',
        submitterLink: 'https://example.com/s/abc',
      },
    );

    expect(result.html).toBe(
      '<p>Hi <strong>Ada</strong>,</p><p>Please <a href="https://example.com/s/abc">Review and Sign</a></p><p><u>Thanks</u>,<br>Signa Inc.&lt;script&gt;alert(1)&lt;/script&gt;</p>',
    );
  });

  it('auto-links plain URLs', () => {
    const result = renderEmailTemplate('Open https://example.com now', {});

    expect(result.html).toBe(
      '<p>Open <a href="https://example.com">https://example.com</a> now</p>',
    );
  });
});
