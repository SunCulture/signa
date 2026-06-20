# Signa Email Templates

These templates mirror DocuSeal's mailer surface while using Signa branding.

Compatibility rules:

- Use table-based layout and inline styles for broad email-client support.
- Keep media queries defensive only; core layout must work without them.
- Use absolute image URLs in runtime context. Do not rely on relative paths in production email.
- Avoid external fonts, JavaScript, forms, CSS grid, flexbox-dependent structure, and background images.

Expected runtime branding context:

- `logoUrl`: absolute URL for the Signa logo.
- `accountName`: sender/account display name.
- `locale`: email document language.

Recommended env values:

- `MAIL_LOGO_URL`: absolute URL for `apps/frontend/public/images/logo.png`.
- `MAIL_ASSET_BASE_URL`: absolute base URL for the illustration directory.

Suggested illustration asset names:

- `signature-invitation.png`
- `document-completed.png`
- `document-copy.png`
- `security-code.png`
- `team-invitation.png`
- `password-reset.png`
- `smtp-success.png`

Place the final illustration files somewhere publicly served, for example:

`apps/frontend/public/images/email/`

Then provide absolute URLs through mail context, such as:

`https://your-domain.com/images/email/signature-invitation.png`
