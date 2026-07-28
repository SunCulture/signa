export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

export const apiUrl = !apiBaseUrl
  ? "/api"
  : apiBaseUrl.endsWith("/api")
    ? apiBaseUrl
    : `${apiBaseUrl}/api`;

export async function apiFetch<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const headers = new Headers(init?.headers);

  applyClientContextHeaders(headers);

  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${resolveApiUrl()}${normalizePath(path)}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const details = await readJsonSafely(response);
    const message =
      getErrorMessage(details) || response.statusText || "Request failed";

    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as TResponse;
  }

  const text = await response.text();

  if (!text) {
    return undefined as TResponse;
  }

  return JSON.parse(text) as TResponse;
}

export function resolveApiUrl(): string {
  if (apiUrl.startsWith("http://") || apiUrl.startsWith("https://")) {
    return apiUrl;
  }

  if (typeof window !== "undefined") {
    return apiUrl;
  }

  const internalApiUrl = (
    process.env.INTERNAL_API_URL ?? "http://127.0.0.1:3001"
  ).replace(/\/$/, "");

  return internalApiUrl.endsWith("/api")
    ? internalApiUrl
    : `${internalApiUrl}/api`;
}

export function resolveBrowserApiUrl(): string {
  if (typeof window === "undefined" || !apiUrl.startsWith("/")) {
    return apiUrl;
  }

  return new URL(apiUrl, window.location.origin).toString().replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function applyClientContextHeaders(headers: Headers): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!headers.has("X-Signa-Timezone")) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (timezone) {
      headers.set("X-Signa-Timezone", timezone);
    }
  }

  if (!headers.has("X-Signa-Locale") && navigator.language) {
    headers.set("X-Signa-Locale", navigator.language);
  }
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(details: unknown): string | null {
  if (
    details &&
    typeof details === "object" &&
    "error" in details &&
    typeof details.error === "string"
  ) {
    return details.error;
  }

  if (
    details &&
    typeof details === "object" &&
    "message" in details &&
    typeof details.message === "string"
  ) {
    return details.message;
  }

  return null;
}
