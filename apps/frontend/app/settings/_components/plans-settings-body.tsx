"use client"

import { useMemo, useState } from "react"
import { CheckCircle2Icon, CircleHelpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SettingsSidebar } from "./settings-sidebar"

const annualPrice = 560
const threeYearPrice = 1380

const licenseFeatures = [
  "Unlimited signature requests",
  "Your company logo",
  "Custom email content",
  "Automated reminders",
  "Webhooks",
  "Connect your Gmail or Outlook email",
  "Conditional fields and formulas",
  "User roles and teams",
  "Bulk send from CSV and XLSX spreadsheet",
  "SSO / SAML ready architecture",
  "Invitation and verification via SMS",
  "API and Embedding",
]

export function PlansSettingsBody() {
  const [billingTerm, setBillingTerm] = useState<"annual" | "three_year">(
    "annual"
  )
  const price = billingTerm === "annual" ? annualPrice : threeYearPrice
  const monthlyEquivalent = useMemo(
    () =>
      billingTerm === "annual"
        ? Math.round(annualPrice / 12)
        : Math.round(threeYearPrice / 36),
    [billingTerm]
  )

  return (
    <div className="flex flex-wrap gap-8 md:flex-nowrap">
      <SettingsSidebar active="Plans" />
      <section className="min-w-0 flex-1 pb-12">
        <h1 className="text-4xl font-bold tracking-normal">Licenses</h1>

        <div className="mt-5 rounded-2xl border-2 border-[var(--auth-accent)] bg-[var(--auth-card)] p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-5xl font-extrabold text-[var(--auth-accent)]">
                Signa License
              </p>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-extrabold">${price}</span>
                <span className="pb-1 text-base font-bold">
                  / {billingTerm === "annual" ? "year" : "3 years"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Approx. ${monthlyEquivalent} / month equivalent
              </p>
            </div>

            <div className="rounded-full border bg-background p-1">
              <button
                className={
                  billingTerm === "annual"
                    ? "rounded-full bg-[var(--auth-primary)] px-4 py-2 text-sm font-bold text-[var(--auth-primary-foreground)]"
                    : "rounded-full px-4 py-2 text-sm font-bold"
                }
                onClick={() => setBillingTerm("annual")}
                type="button"
              >
                Annual
              </button>
              <button
                className={
                  billingTerm === "three_year"
                    ? "rounded-full bg-[var(--auth-primary)] px-4 py-2 text-sm font-bold text-[var(--auth-primary-foreground)]"
                    : "rounded-full px-4 py-2 text-sm font-bold"
                }
                onClick={() => setBillingTerm("three_year")}
                type="button"
              >
                3 years
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-4 md:grid-cols-2">
            {licenseFeatures.map((feature) => (
              <div className="flex items-center gap-3" key={feature}>
                <CheckCircle2Icon className="text-[var(--auth-primary)]" />
                <span>{feature}</span>
                {feature.includes("roles") ||
                feature.includes("SMS") ||
                feature.includes("API") ? (
                  <CircleHelpIcon className="text-muted-foreground" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-9 flex justify-center">
            <Button className="h-12 w-full max-w-md rounded-full text-base font-bold">
              Purchase License
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
