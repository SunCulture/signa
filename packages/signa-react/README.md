# @signajs/react

React components for embedding Signa signing forms and template builder workflows.

The API intentionally mirrors `@docuseal/react` so existing DocuSeal-style embeds can migrate with minimal changes. The components load Signa browser custom elements from your Signa host and pass configuration through `data-*` attributes.

## Install

```bash
npm install @signajs/react
```

```bash
pnpm add @signajs/react
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
import { SignaForm } from "@signajs/react";

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
import { DocusealForm } from "@signajs/react";
```

### Signing Form Props

`SignaForm` mirrors `@docuseal/react` and supports the same public prop contract:

| Prop | Description |
| --- | --- |
| `src` | Public signing URL, usually `https://signa.example.com/s/{submitterSlug}` or `https://signa.example.com/d/{templateSlug}`. |
| `token` | Signed embed token where supported by the host. |
| `host` | Signa host that serves `/js/form.js`. |
| `email`, `name`, `role`, `submitter`, `externalId` | Submitter identity and routing values. |
| `preview`, `dryRun`, `expand`, `minimize`, `orderAsOnPage` | Display and flow options. |
| `withTitle`, `withDecline`, `withFieldNames`, `withDownloadButton`, `withSendCopyButton`, `withCompleteButton` | Signing UI toggles. |
| `allowToResubmit`, `allowTypedSignature`, `rememberSignature`, `reuseSignature` | Signer behavior toggles. |
| `values`, `metadata`, `fields`, `readonlyFields`, `i18n` | Prefilled values and runtime configuration. |
| `onInit`, `onLoad`, `onComplete`, `onDecline` | Lifecycle callbacks. |

## Template Builder

```tsx
import { SignaBuilder } from "@signajs/react";

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

| Prop | Description |
| --- | --- |
| `token` | Builder token for the hosted Signa builder flow. |
| `host` | Signa host that serves `/js/builder.js`. |
| `withRecipientsButton`, `withSendButton`, `withTitle`, `withDocumentsList`, `withFieldsList` | Builder UI toggles. |
| `withFieldsDetection`, `withFieldPlaceholder`, `withPrefillable`, `withCustomFieldsTab` | Field-management options. |
| `roles`, `fieldTypes`, `drawFieldType`, `fields`, `submitters`, `requiredFields`, `dateFormats` | Builder defaults and constraints. |
| `customButton`, `emailMessage`, `backgroundColor`, `saveButtonText`, `sendButtonText`, `customCss` | Presentation and copy controls. |
| `onLoad`, `onUpload`, `onSend`, `onSave`, `onChange` | Builder lifecycle callbacks. |

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
pnpm --filter @signajs/react typecheck
pnpm --filter @signajs/react build
pnpm pack:signa-react
```

The build emits:

- `dist/index.js`: ESM bundle
- `dist/index.cjs`: CommonJS bundle
- `dist/*.d.ts`: TypeScript declarations

The package intentionally keeps `react` as a peer dependency so applications control their React version.

## Publishing to npm

1. Confirm the package name and npm scope are available. The current package name is `@signajs/react`; publishing this requires access to the `signajs` npm organization or scope.

2. Authenticate with npm:

```bash
npm login
```

3. Run the package checks:

```bash
pnpm --filter @signajs/react typecheck
pnpm --filter @signajs/react build
pnpm --filter @signajs/react pack --dry-run
```

4. Create a Changeset from the repo root. Use the semver level that matches the change:

```bash
pnpm changeset
```

Use `minor` for backward-compatible features and `major` for breaking API changes.

5. Prepare the release version and changelog:

```bash
pnpm version:packages
pnpm --filter @signajs/react typecheck
pnpm --filter @signajs/react build
pnpm pack:signa-react
```

Commit the generated version/changelog changes, then merge them through the normal review flow.

6. Publish the package:

```bash
pnpm release:packages
```

7. Verify the published package:

```bash
npm view @signajs/react version
```

8. Tag the release in git after the publish succeeds:

```bash
git tag signa-react-v$(node -p "require('./packages/signa-react/package.json').version")
git push origin --tags
```

For CI, use npm trusted publishing with provenance instead of long-lived npm tokens where possible.

If the `@signajs` scope is unavailable, rename `name` in `packages/signa-react/package.json` before publishing, for example to `signa-react`, then rerun the checks and publish without `--access public` unless the target package is scoped.
