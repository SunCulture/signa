# @signa/react

React components for embedding Signa signing forms and template builder workflows.

The API intentionally mirrors `@docuseal/react` so existing DocuSeal-style embeds can migrate with minimal changes. The components load Signa browser custom elements from your Signa host and pass configuration through `data-*` attributes.

## Install

```bash
npm install @signa/react
```

```bash
pnpm add @signa/react
```

The package expects a running Signa instance because it embeds the hosted Signa browser custom elements from `/js/form.js` and `/js/builder.js`.

For local development against this monorepo:

```bash
pnpm install
pnpm dev
```

Then point the React package at the local frontend host:

```tsx
<SignaForm host="http://localhost:3000" src="http://localhost:3000/s/submitter-slug" />
```

## Signing Form

```tsx
import { SignaForm } from "@signa/react";

export function ContractSigning() {
  return (
    <SignaForm
      host="https://signa.example.com"
      src="https://signa.example.com/s/submitter-slug"
      withDownloadButton
      withSendCopyButton
      onComplete={(data) => {
        console.log("completed", data);
      }}
    />
  );
}
```

DocuSeal-compatible aliases are also exported:

```tsx
import { DocusealForm } from "@signa/react";
```

### Signing Form Props

`SignaForm` mirrors `@docuseal/react` and supports the same public prop contract:

- `src`: public signing URL, usually `https://signa.example.com/s/{submitterSlug}` or `https://signa.example.com/d/{templateSlug}`.
- `token`: signed embed token where supported by the host.
- `host`: Signa host that serves `/js/form.js`.
- `email`, `name`, `role`, `submitter`, `externalId`: submitter identity and routing values.
- `preview`, `dryRun`, `expand`, `minimize`, `orderAsOnPage`: display and flow options.
- `withTitle`, `withDecline`, `withFieldNames`, `withDownloadButton`, `withSendCopyButton`, `withCompleteButton`: signing UI toggles.
- `allowToResubmit`, `allowTypedSignature`, `rememberSignature`, `reuseSignature`: signer behavior toggles.
- `values`, `metadata`, `fields`, `readonlyFields`, `i18n`: prefilled values and runtime configuration.
- `onInit`, `onLoad`, `onComplete`, `onDecline`: lifecycle callbacks.

## Template Builder

```tsx
import { SignaBuilder } from "@signa/react";

export function EmbeddedBuilder() {
  return (
    <SignaBuilder
      host="https://signa.example.com"
      token="builder-token"
      onSave={(template) => {
        console.log("saved", template);
      }}
    />
  );
}
```

### Template Builder Props

`SignaBuilder` follows the same prop shape as `@docuseal/react`:

- `token`: builder token for the hosted Signa builder flow.
- `host`: Signa host that serves `/js/builder.js`.
- `withRecipientsButton`, `withSendButton`, `withTitle`, `withDocumentsList`, `withFieldsList`: builder UI toggles.
- `withFieldsDetection`, `withFieldPlaceholder`, `withPrefillable`, `withCustomFieldsTab`: field-management options.
- `roles`, `fieldTypes`, `drawFieldType`, `fields`, `submitters`, `requiredFields`, `dateFormats`: builder defaults and constraints.
- `customButton`, `emailMessage`, `backgroundColor`, `saveButtonText`, `sendButtonText`, `customCss`: presentation and copy controls.
- `onLoad`, `onUpload`, `onSend`, `onSave`, `onChange`: builder lifecycle callbacks.

## Runtime Scripts

By default the package loads:

- `https://cdn.signa.com/js/form.js`
- `https://cdn.signa.com/js/builder.js`

For self-hosted Signa, pass your host:

```tsx
<SignaForm host="signa.company.com" src="https://signa.company.com/s/abc123" />
```

When `host` includes a scheme, it is used directly:

```tsx
<SignaForm host="http://localhost:3000" src="http://localhost:3000/s/abc123" />
```

## Events

The wrapper listens for the same custom events as DocuSeal:

- form: `completed`, `init`, `declined`, `load`
- builder: `send`, `load`, `upload`, `save`, `change`

Callbacks receive the event `detail` payload emitted by the hosted Signa custom element.

## Development

From the repository root:

```bash
pnpm --filter @signa/react typecheck
pnpm --filter @signa/react build
pnpm --filter @signa/react pack --dry-run
```

The build emits:

- `dist/index.js`: ESM bundle
- `dist/index.cjs`: CommonJS bundle
- `dist/*.d.ts`: TypeScript declarations

The package intentionally keeps `react` as a peer dependency so applications control their React version.

## Publishing to npm

1. Confirm the package name and npm scope are available. The current package name is `@signa/react`; publishing this requires access to the `signa` npm organization or scope.

2. Authenticate with npm:

```bash
npm login
```

3. Run the package checks:

```bash
pnpm --filter @signa/react typecheck
pnpm --filter @signa/react build
pnpm --filter @signa/react pack --dry-run
```

4. Bump the package version from the repo root. Use the semver level that matches the change:

```bash
pnpm --filter @signa/react version patch
```

Use `minor` for backward-compatible features and `major` for breaking API changes.

5. Publish the package:

```bash
pnpm --filter @signa/react publish --access public
```

6. Verify the published package:

```bash
npm view @signa/react version
```

7. Tag the release in git after the publish succeeds:

```bash
git tag signa-react-v$(node -p "require('./packages/signa-react/package.json').version")
git push origin --tags
```

If the `@signa` scope is unavailable, rename `name` in `packages/signa-react/package.json` before publishing, for example to `signa-react`, then rerun the checks and publish without `--access public` unless the target package is scoped.
