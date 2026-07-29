function publicOrigin(variable: string | undefined, fallback: string): string {
  const value = variable?.trim() || fallback;
  const url = new URL(
    value.includes("://") ? value : `https://${value}`,
  );

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported public URL protocol: ${url.protocol}`);
  }

  return url.origin;
}

export const marketingUrl = publicOrigin(
  process.env.NEXT_PUBLIC_MARKETING_URL,
  "http://localhost:3002",
);

export const appUrl = publicOrigin(
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
);
