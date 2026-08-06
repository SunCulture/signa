import type { Metadata } from "next";

import { AccountEntryPage } from "@/components/marketing/account-entry-page";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Signa account.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SignUpPage() {
  return <AccountEntryPage mode="sign-up" />;
}
