# @signajs/react-native

React Native components for embedding Signa signing flows in mobile apps.

The package uses `react-native-webview` and keeps the signing UI hosted by
Signa. This mirrors the web embed security model while giving native apps typed
completion, decline, load, and error callbacks.

## Installation

```sh
pnpm add @signajs/react-native react-native-webview
```

For bare React Native apps, follow the `react-native-webview` installation
steps for iOS pods and Android setup.

## Basic Usage

```tsx
import { SignaSigningView } from "@signajs/react-native";

export function ContractSigningScreen() {
  return (
    <SignaSigningView
      src="https://signa.example.com/s/submitter-slug"
      onComplete={(submitter) => {
        console.log("Completed", submitter.id);
      }}
      onDecline={(submitter) => {
        console.log("Declined", submitter.id);
      }}
      onError={(error) => {
        console.warn(error.message);
      }}
    />
  );
}
```

## Host + Slug Usage

```tsx
<SignaSigningView
  host="https://signa.example.com"
  slug="submitter-slug"
  token="optional-signed-embed-token"
/>
```

## Props

| Prop | Description |
| --- | --- |
| `src` | Full public signing URL, usually `https://signa.example.com/s/{submitterSlug}`. |
| `host` | Signa host used with `slug` when `src` is not provided. |
| `slug` | Submitter slug used with `host` to build `/s/{slug}`. |
| `token` | Optional signed embed token where supported by the host. |
| `preview`, `dryRun`, `expand`, `minimize` | Signing display and flow options passed as query params. |
| `language`, `email`, `name`, `role`, `externalId` | Signer identity, locale, and routing values passed as query params. |
| `style`, `webViewStyle` | Container and WebView style overrides. |
| `showsLoadingIndicator` | Enables the built-in loading state. Defaults to `true`. |
| `allowsInlineMediaPlayback` | Passed to `WebView`. Defaults to `true`. |
| `mixedContentMode` | Passed to Android WebView. Defaults to `compatibility`. |
| `javaScriptEnabled`, `domStorageEnabled` | Required WebView features. Both default to `true`. |
| `originWhitelist` | WebView origin whitelist. Defaults to `["https://*", "http://*"]`. |
| `onLoad` | Called when Signa posts `signa:loaded`. |
| `onComplete` | Called when Signa posts `signa:completed`. |
| `onDecline` | Called when Signa posts `signa:declined`. |
| `onError` | Called when Signa posts `signa:error`. |
| `onMessage` | Receives every validated `signa:*` message. |

## Mobile App Permissions

If signers need to upload files, images, or use camera-backed fields, configure
the host app permissions:

- iOS: camera, photo library, and document picker usage descriptions.
- Android: camera and media/document permissions appropriate for your target SDK.

## Signa Host Requirements

The Signa signing page should post lifecycle events when loaded inside a React
Native WebView:

```js
window.ReactNativeWebView?.postMessage(
  JSON.stringify({ type: "signa:completed", payload: submitter }),
);
```

The web signing page already remains usable inside a WebView. These postMessage
events are the native bridge that lets the app react without polling.
