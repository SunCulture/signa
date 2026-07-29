const requiredVercelVariables = [
  "NEXT_PUBLIC_MARKETING_URL",
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
];

if (process.env.VERCEL === "1") {
  const missing = requiredVercelVariables.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required Vercel environment variables: ${missing.join(", ")}`,
    );
  }

  for (const name of [
    "NEXT_PUBLIC_MARKETING_URL",
    "NEXT_PUBLIC_APP_URL",
    "SUPABASE_URL",
  ]) {
    const value = process.env[name];
    let url;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid absolute URL.`);
    }

    if (url.protocol !== "https:") {
      throw new Error(`${name} must use HTTPS on Vercel.`);
    }

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      throw new Error(`${name} cannot point to localhost on Vercel.`);
    }
  }
}
