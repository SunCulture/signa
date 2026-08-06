"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import {
  licenseFeatures,
  licenseOptions,
  type LicenseTerm,
} from "@/lib/landing-content";
import { cn } from "@/lib/utils";

export function LicenseCard() {
  const [term, setTerm] = useState<LicenseTerm>("annual");
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const option = licenseOptions[term];
  const formattedPrice = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(option.price),
    [option.price],
  );

  return (
    <div
      id="license"
      className="mt-12 overflow-hidden rounded-lg bg-white shadow-card ring-1 ring-line"
    >
      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-ink p-8 text-white lg:p-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-signa-300">
            <ShieldCheck className="size-4 text-mint" />
            Commercial self-hosting
          </div>
          <h3 className="mt-8 text-3xl font-semibold tracking-normal">
            Signa License
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-signa-200">
            Run Signa in your environment with the product, automation, and
            branding capabilities needed for production teams.
          </p>

          <div
            className="mt-8 grid grid-cols-2 gap-1 rounded-lg bg-white/8 p-1"
            aria-label="License duration"
          >
            {(Object.keys(licenseOptions) as LicenseTerm[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={term === value}
                onClick={() => {
                  setTerm(value);
                  setShowPlaceholder(false);
                }}
                className={cn(
                  "h-10 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint",
                  term === value
                    ? "bg-mint text-ink"
                    : "text-signa-200 hover:bg-white/8 hover:text-white",
                )}
              >
                {licenseOptions[value].label}
              </button>
            ))}
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-5xl font-semibold">{formattedPrice}</span>
              <span className="pb-1 text-sm text-signa-200">
                {option.period}
              </span>
            </div>
            <p className="mt-2 text-sm text-signa-300">
              About ${option.monthlyEquivalent}/month. {option.note}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowPlaceholder(true)}
            className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink shadow-button transition-colors hover:bg-[#acebd4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Purchase license
            <ArrowRight className="size-4" />
          </button>

          <div aria-live="polite" className="min-h-12 pt-3">
            {showPlaceholder ? (
              <p className="flex items-start gap-2 text-xs leading-5 text-signa-200">
                <Clock3 className="mt-0.5 size-3.5 shrink-0 text-mint" />
                Checkout is temporarily unavailable. Please try again later.
              </p>
            ) : null}
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase text-copy">
            Included in every license
          </p>
          <div className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {licenseFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 text-sm leading-5 text-copy"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-signa-700" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
