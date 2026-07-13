export type SignaSigningUrlOptions = {
  src?: string;
  host?: string;
  slug?: string;
  token?: string;
  preview?: boolean;
  dryRun?: boolean;
  expand?: boolean;
  minimize?: boolean;
  language?: string;
  email?: string;
  name?: string;
  role?: string;
  externalId?: string;
};

export function buildSignaSigningUrl(options: SignaSigningUrlOptions): string {
  const url = createBaseUrl(options);

  appendOptionalQuery(url, "token", options.token);
  appendOptionalQuery(url, "preview", formatBoolean(options.preview));
  appendOptionalQuery(url, "dry_run", formatBoolean(options.dryRun));
  appendOptionalQuery(url, "expand", formatBoolean(options.expand));
  appendOptionalQuery(url, "minimize", formatBoolean(options.minimize));
  appendOptionalQuery(url, "language", options.language);
  appendOptionalQuery(url, "email", options.email);
  appendOptionalQuery(url, "name", options.name);
  appendOptionalQuery(url, "role", options.role);
  appendOptionalQuery(url, "external_id", options.externalId);

  return url.toString();
}

function createBaseUrl(options: SignaSigningUrlOptions): URL {
  if (options.src) {
    return new URL(options.src);
  }

  if (!options.host || !options.slug) {
    throw new Error("SignaSigningView requires either src or both host and slug.");
  }

  return new URL(`/s/${options.slug}`, normalizeHost(options.host));
}

function appendOptionalQuery(
  url: URL,
  key: string,
  value: string | undefined,
): void {
  if (value) {
    url.searchParams.set(key, value);
  }
}

function formatBoolean(value: boolean | undefined): string | undefined {
  return typeof value === "boolean" ? String(value) : undefined;
}

function normalizeHost(host: string): string {
  return host.replace(/\/+$/, "");
}
