import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const allowedSources = new Set(["blog_header", "blog_footer"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterRequest = {
  email?: unknown;
  source?: unknown;
  website?: unknown;
};

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json(
      { message: "This endpoint accepts JSON requests only." },
      415,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > 2048) {
    return json({ message: "The request is too large." }, 413);
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return json({ message: "The request origin is not allowed." }, 403);
  }

  let body: NewsletterRequest;

  try {
    const rawBody = await request.text();

    if (rawBody.length > 2048) {
      return json({ message: "The request is too large." }, 413);
    }

    body = JSON.parse(rawBody) as NewsletterRequest;
  } catch {
    return json({ message: "Enter a valid email address." }, 400);
  }

  // Bots commonly populate hidden fields that real visitors never see.
  if (typeof body.website === "string" && body.website.length > 0) {
    return json({
      message: "Check your inbox for the next Signa update.",
    });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const source =
    typeof body.source === "string" && allowedSources.has(body.source)
      ? body.source
      : "blog_header";

  if (
    email.length < 3 ||
    email.length > 320 ||
    !emailPattern.test(email)
  ) {
    return json({ message: "Enter a valid email address." }, 400);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        email,
        source,
        status: "subscribed",
        subscribed_at: now,
        updated_at: now,
      },
      { onConflict: "email" },
    );

    if (error) {
      console.error("Newsletter subscription failed", {
        code: error.code,
        message: error.message,
      });
      return json(
        { message: "Subscriptions are temporarily unavailable. Try again." },
        503,
      );
    }

    return json({
      message: "You're subscribed. Watch your inbox for the next Signa update.",
    });
  } catch (error) {
    console.error(
      "Newsletter subscription configuration error",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json(
      { message: "Subscriptions are temporarily unavailable. Try again." },
      503,
    );
  }
}

function json(body: { message: string }, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
