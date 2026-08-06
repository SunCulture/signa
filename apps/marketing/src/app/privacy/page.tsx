import type { Metadata } from "next";

import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Signa handles account and service information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 29, 2026">
      <section>
        <h2>Information we process</h2>
        <p>
          We process account details, service requests, support messages, and
          operational telemetry needed to provide and secure Signa. A
          self-hosted deployment stores document and signer data within the
          infrastructure selected by its operator.
        </p>
      </section>
      <section>
        <h2>How information is used</h2>
        <p>
          Information is used to operate accounts, deliver requested services,
          protect the platform, diagnose failures, communicate with users, and
          meet legal obligations.
        </p>
      </section>
      <section>
        <h2>Journal subscriptions</h2>
        <p>
          When you subscribe to the Signa journal, we store your email address
          and the subscription source so we can send product updates and
          practical document-signing guidance. You may opt out using the
          unsubscribe instructions included in those messages.
        </p>
      </section>
      <section>
        <h2>Retention and security</h2>
        <p>
          We retain information only as needed for the purposes described here
          and apply administrative and technical controls appropriate to the
          information processed. No system can guarantee absolute security.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You may request access, correction, or deletion of eligible account
          information. Deployment operators are responsible for responding to
          requests involving data held inside their own Signa installation.
        </p>
      </section>
    </LegalPage>
  );
}
