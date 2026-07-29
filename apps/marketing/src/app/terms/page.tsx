import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms governing access to Signa services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 29, 2026">
      <section>
        <h2>Using Signa</h2>
        <p>
          You may use Signa only in compliance with applicable law and these
          terms. You are responsible for the accounts, documents, recipients,
          and signing workflows created through your deployment.
        </p>
      </section>
      <section>
        <h2>Accounts and security</h2>
        <p>
          Keep credentials and API keys confidential, provide accurate account
          information, and promptly report suspected unauthorized access. You
          are responsible for activity performed through your account.
        </p>
      </section>
      <section>
        <h2>Documents and signatures</h2>
        <p>
          You must have the authority to upload, send, sign, and retain each
          document. Signature, consent, identity, retention, and disclosure
          requirements vary by jurisdiction and workflow.
        </p>
      </section>
      <section>
        <h2>Service availability</h2>
        <p>
          We work to operate Signa reliably, but availability can be affected
          by maintenance, third-party infrastructure, and events outside our
          control. Self-hosted operators remain responsible for their own
          infrastructure and backups.
        </p>
      </section>
    </LegalPage>
  );
}
