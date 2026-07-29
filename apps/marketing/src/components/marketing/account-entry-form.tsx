"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";

import { Wordmark } from "@/components/marketing/wordmark";
import { cn } from "@/lib/utils";

type AccountEntryMode = "sign-in" | "sign-up";

const inputClassName =
  "h-10 w-full rounded-lg border border-transparent bg-signa-100 px-4 text-sm text-ink outline-none transition placeholder:text-signa-500 focus:border-signa-300 focus:bg-white focus:ring-3 focus:ring-signa-200";

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="size-4"
      fill="none"
    >
      <path
        d="M30.001 16.311c0-1.151-.095-1.991-.301-2.862H16.287v5.195h7.873c-.159 1.292-1.016 3.236-2.921 4.542l4.508 3.423c2.699-2.443 4.254-6.036 4.254-10.298Z"
        fill="#4285F4"
      />
      <path
        d="M16.286 30c3.857 0 7.095-1.244 9.461-3.391l-4.508-3.423c-1.207.825-2.826 1.401-4.953 1.401-3.777 0-6.984-2.443-8.127-5.818l-4.635 3.515C5.874 26.858 10.699 30 16.286 30Z"
        fill="#34A853"
      />
      <path
        d="M8.16 18.769a8.389 8.389 0 0 1-.476-2.769c0-.965.175-1.898.46-2.769L3.525 9.715A14.013 14.013 0 0 0 2.001 16c0 2.256.556 4.387 1.524 6.284L8.16 18.769Z"
        fill="#FBBC05"
      />
      <path
        d="M16.286 7.413c2.683 0 4.492 1.136 5.524 2.085l4.032-3.858C23.366 3.384 20.143 2 16.286 2 10.699 2 5.874 5.142 3.524 9.715l4.619 3.516c1.159-3.375 4.366-5.818 8.143-5.818Z"
        fill="#EB4335"
      />
    </svg>
  );
}

export function AccountEntryForm({ mode }: { mode: AccountEntryMode }) {
  const isSignUp = mode === "sign-up";
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitRequest(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter a valid email address to continue.");
      return;
    }

    if (isSignUp && !acceptedTerms) {
      setError("Accept the Terms and Privacy Policy to continue.");
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setIsSubmitting(false);
    setError(
      "We couldn't complete your request. Check your details and try again.",
    );
  }

  async function submitGoogleRequest() {
    setError("");
    setIsSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setIsSubmitting(false);
    setError(
      "We couldn't complete your request. Check your details and try again.",
    );
  }

  return (
    <div className="w-full max-w-md py-16 lg:py-24">
      <div className="text-center lg:text-left">
        <Link
          href="/"
          aria-label="Go to the Signa homepage"
          className="inline-flex"
        >
          <Wordmark className="mx-auto h-16 w-28 lg:mx-0" />
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-normal text-ink md:text-4xl">
          {isSignUp ? "Sign up" : "Sign in"}
        </h1>
        <p className="mt-3 text-base font-medium text-copy">
          {isSignUp
            ? "Create your Signa account."
            : "Continue to your Signa workspace."}
        </p>
      </div>

      <form className="mt-12" onSubmit={submitRequest} noValidate>
        <div>
          <label
            htmlFor={`${mode}-email`}
            className="text-sm font-medium text-copy"
          >
            Email
          </label>
          <input
            id={`${mode}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className={cn(inputClassName, "mt-2.5")}
          />
        </div>

        {isSignUp ? (
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-1 size-4 shrink-0 rounded-sm border-signa-300 accent-signa-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signa-700"
            />
            <span>
              Creating an account means you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-signa-700 hover:text-ink"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-signa-700 hover:text-ink"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        ) : null}

        {error ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-5 flex items-start gap-2 border-l-2 border-coral-500 bg-coral-100 px-3 py-2.5 text-sm text-coral-800"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-button transition hover:bg-signa-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signa-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {isSignUp ? "Sign up" : "Sign in"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={submitGoogleRequest}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border bg-signa-50 px-4 text-sm font-medium text-ink shadow-button transition hover:bg-signa-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signa-700 disabled:cursor-wait disabled:opacity-70"
          >
            <GoogleIcon />
            {isSignUp ? "Sign up with Google" : "Sign in with Google"}
          </button>
        </div>
      </form>

      <p className="mt-5 text-sm font-medium text-copy">
        {isSignUp ? "Already have an account?" : "New to Signa?"}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="text-ink hover:text-signa-700"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>

      <Link
        href="/"
        className="group mt-12 inline-flex items-center gap-2 text-sm font-medium text-ink"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        Go back
      </Link>
    </div>
  );
}
