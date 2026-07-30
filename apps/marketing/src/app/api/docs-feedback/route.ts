import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const allowedPathPattern =
  /^\/(?:docs(?:\/(?:api|embedding|webhooks))?|guides(?:\/[a-z0-9-]+)?|resources(?:\/[a-z0-9-]+)?|compliance|qualified-electronic-signature)$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FeedbackRequest = {
  helpful?: unknown;
  path?: unknown;
  responseId?: unknown;
};

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ message: "This endpoint accepts JSON requests only." }, 415);
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(contentLength) && contentLength > 1024) {
    return json({ message: "The request is too large." }, 413);
  }

  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return json({ message: "The request origin is not allowed." }, 403);
  }

  let body: FeedbackRequest;

  try {
    const rawBody = await request.text();

    if (rawBody.length > 1024) {
      return json({ message: "The request is too large." }, 413);
    }

    body = JSON.parse(rawBody) as FeedbackRequest;
  } catch {
    return json({ message: "Submit a valid feedback response." }, 400);
  }

  const path = typeof body.path === "string" ? body.path.trim() : "";
  const responseId =
    typeof body.responseId === "string" ? body.responseId.trim() : "";

  if (
    typeof body.helpful !== "boolean" ||
    !allowedPathPattern.test(path) ||
    !uuidPattern.test(responseId)
  ) {
    return json({ message: "Submit a valid feedback response." }, 400);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("docs_page_feedback").upsert(
      {
        response_id: responseId,
        path,
        helpful: body.helpful,
        updated_at: now,
      },
      { onConflict: "response_id" },
    );

    if (error) {
      console.error("Documentation feedback submission failed", {
        code: error.code,
        message: error.message,
      });
      return json(
        { message: "Feedback is temporarily unavailable. Try again." },
        503,
      );
    }

    return json({ message: "Thanks for sharing your feedback." });
  } catch (error) {
    console.error(
      "Documentation feedback configuration error",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json(
      { message: "Feedback is temporarily unavailable. Try again." },
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
