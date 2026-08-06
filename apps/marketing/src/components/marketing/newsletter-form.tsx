"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type NewsletterFormProps = {
  className?: string;
  label?: string;
  source: "blog_header" | "blog_footer";
};

type FormStatus =
  | { kind: "idle"; message: string }
  | { kind: "loading"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function NewsletterForm({
  className,
  label = "Subscribe to the Signa journal",
  source,
}: NewsletterFormProps) {
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>({
    kind: "idle",
    message:
      "Occasional product updates and practical document-signing guides.",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setStatus({ kind: "loading", message: "Subscribing..." });

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source,
          website: form.get("website"),
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to subscribe.");
      }

      setEmail("");
      setStatus({
        kind: "success",
        message: payload.message || "You're subscribed.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to subscribe. Try again.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label htmlFor={inputId} className="text-xs font-medium text-copy">
        {label}
      </label>
      <div className="mt-1 flex flex-col gap-2">
        <input
          id={inputId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={320}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-describedby={statusId}
          placeholder="email@example.com"
          className="h-10 w-full rounded-lg border border-transparent bg-signa-100 px-4 py-2 text-sm text-signa-700 outline-none transition placeholder:text-signa-500 focus:border-signa-500 focus:bg-white focus:ring-2 focus:ring-signa-200"
        />
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[10000px] h-px w-px overflow-hidden"
        />
        <button
          type="submit"
          disabled={status.kind === "loading"}
          className="h-10 w-full rounded-lg border border-ink bg-ink px-4 text-sm font-medium text-white shadow-button transition hover:bg-signa-800 disabled:cursor-wait disabled:opacity-65"
        >
          {status.kind === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </div>
      <p
        id={statusId}
        aria-live="polite"
        className={cn(
          "mt-2 min-h-8 text-xs font-medium leading-4",
          status.kind === "error"
            ? "text-red-600"
            : status.kind === "success"
              ? "text-signa-700"
              : "text-copy",
        )}
      >
        {status.message}
      </p>
    </form>
  );
}
