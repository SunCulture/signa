import type { Metadata } from "next";

import { AccountEntryPage } from "@/components/marketing/account-entry-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Signa workspace.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignInPage() {
  return <AccountEntryPage mode="sign-in" />;
}
