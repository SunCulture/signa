"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Code2Icon,
  LifeBuoyIcon,
} from "lucide-react";

import {
  docsPageLinks,
  type DocsNavLink,
} from "@/components/docs/docs-nav-links";
import { cn } from "@/lib/utils";

type Vote = "yes" | "no";
type FeedbackState = {
  kind: "idle" | "submitting" | "success" | "error";
  message: string;
};

export function DocsFooter() {
  const pathname = usePathname();
  const navigation = useMemo(() => getNavigation(pathname), [pathname]);

  return (
    <footer className="mt-20 border-t border-border pt-10">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
        <DocsFeedback pathname={pathname} />
        <DocsPager {...navigation} />
      </div>
      <DocsCopyrightRow />
    </footer>
  );
}

function DocsFeedback({ pathname }: { pathname: string }) {
  const storageKey = `signa:docs-feedback:${pathname}`;
  const storedFeedback = useStoredFeedback(storageKey);
  const [optimisticVote, setOptimisticVote] = useState<Vote | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    message: "",
  });
  const vote = optimisticVote ?? storedFeedback?.vote ?? null;
  const statusMessage =
    feedback.kind === "idle" && storedFeedback?.vote
      ? "Thanks for sharing your feedback."
      : feedback.message;

  async function submitVote(nextVote: Vote) {
    const id = storedFeedback?.responseId || window.crypto.randomUUID();

    setOptimisticVote(nextVote);
    setFeedback({ kind: "submitting", message: "Saving feedback..." });

    try {
      const response = await fetch("/api/docs-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helpful: nextVote === "yes",
          path: pathname,
          responseId: id,
        }),
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save feedback.");
      }

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ responseId: id, vote: nextVote }),
      );
      window.dispatchEvent(
        new CustomEvent("signa:docs-feedback-change", {
          detail: storageKey,
        }),
      );
      setOptimisticVote(null);
      setFeedback({
        kind: "success",
        message: payload.message || "Thanks for sharing your feedback.",
      });
    } catch (error) {
      setOptimisticVote(null);
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save feedback. Try again.",
      });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>Was this page helpful?</span>
        <span className="inline-flex rounded-full border border-border bg-background p-1">
          {(["yes", "no"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={vote === option}
              disabled={feedback.kind === "submitting"}
              onClick={() => submitVote(option)}
              className={cn(
                "rounded-full px-4 py-1 font-bold transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-65",
                vote === option &&
                  "bg-[#102852] text-white hover:bg-[#102852]",
              )}
            >
              {option === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </span>
      </div>
      <p
        aria-live="polite"
        className={cn(
          "mt-2 min-h-5 text-xs font-medium",
          feedback.kind === "error"
            ? "text-destructive"
            : "text-muted-foreground",
        )}
      >
        {statusMessage}
      </p>
    </div>
  );
}

function DocsPager({
  next,
  previous,
}: {
  next?: DocsNavLink;
  previous?: DocsNavLink;
}) {
  if (!next && !previous) {
    return null;
  }

  return (
    <nav
      aria-label="Documentation pagination"
      className="grid gap-5 sm:grid-cols-2"
    >
      <PageLink direction="previous" page={previous} />
      <PageLink direction="next" page={next} />
    </nav>
  );
}

function PageLink({
  direction,
  page,
}: {
  direction: "next" | "previous";
  page?: DocsNavLink;
}) {
  if (!page) {
    return <span aria-hidden="true" />;
  }

  const isNext = direction === "next";

  return (
    <Link
      href={page.href}
      className={cn(
        "group flex min-h-24 flex-col justify-center rounded-lg border border-border bg-card px-5 py-4 transition hover:border-input hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isNext ? "items-end text-right" : "items-start",
      )}
    >
      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
        {!isNext && (
          <ArrowLeftIcon className="size-4 transition group-hover:-translate-x-1" />
        )}
        {isNext ? "Next" : "Previous"}
        {isNext && (
          <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
        )}
      </span>
      <span className="mt-2 font-black text-foreground">{page.label}</span>
    </Link>
  );
}

function DocsCopyrightRow() {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-5 border-t border-border py-8 text-sm text-muted-foreground">
      <span>Copyright {new Date().getFullYear()}. All rights reserved.</span>
      <div className="flex items-center gap-2">
        <FooterIconLink
          href="https://github.com/codeignite-labs/signa"
          label="View Signa on GitHub"
          external
        >
          <Code2Icon className="size-4" />
        </FooterIconLink>
        <FooterIconLink href="/resources" label="Browse support resources">
          <LifeBuoyIcon className="size-4" />
        </FooterIconLink>
      </div>
    </div>
  );
}

function FooterIconLink({
  children,
  external = false,
  href,
  label,
}: {
  children: ReactNode;
  external?: boolean;
  href: string;
  label: string;
}) {
  const className =
    "inline-flex size-9 items-center justify-center rounded-full transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (external) {
    return (
      <a
        aria-label={label}
        className={className}
        href={href}
        rel="noreferrer"
        target="_blank"
        title={label}
      >
        {children}
      </a>
    );
  }

  return (
    <Link aria-label={label} className={className} href={href} title={label}>
      {children}
    </Link>
  );
}

function getNavigation(pathname: string) {
  const currentIndex = docsPageLinks.findIndex(
    (page) => page.href === pathname,
  );

  if (currentIndex < 0) {
    return {};
  }

  return {
    previous: docsPageLinks[currentIndex - 1],
    next: docsPageLinks[currentIndex + 1],
  };
}

function useStoredFeedback(storageKey: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === storageKey) {
          onStoreChange();
        }
      }

      function handleLocalChange(event: Event) {
        if ((event as CustomEvent<string>).detail === storageKey) {
          onStoreChange();
        }
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        "signa:docs-feedback-change",
        handleLocalChange,
      );

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
          "signa:docs-feedback-change",
          handleLocalChange,
        );
      };
    },
    [storageKey],
  );
  const getSnapshot = useCallback(
    () => window.localStorage.getItem(storageKey),
    [storageKey],
  );
  const serialized = useSyncExternalStore(subscribe, getSnapshot, () => null);

  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as {
      responseId?: string;
      vote?: Vote;
    };

    if (
      typeof parsed.responseId === "string" &&
      (parsed.vote === "yes" || parsed.vote === "no")
    ) {
      return {
        responseId: parsed.responseId,
        vote: parsed.vote,
      };
    }
  } catch {
    return null;
  }

  return null;
}
