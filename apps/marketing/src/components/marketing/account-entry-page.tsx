import Image from "next/image";

import { AccountEntryForm } from "@/components/marketing/account-entry-form";

export function AccountEntryPage({
  mode,
}: {
  mode: "sign-in" | "sign-up";
}) {
  return (
    <main className="min-h-svh bg-white">
      <div className="flex min-h-svh">
        <div className="flex w-full items-center justify-center px-6 sm:px-10 lg:w-2/3 lg:px-16">
          <AccountEntryForm mode={mode} />
        </div>
        <div className="relative order-first hidden min-h-svh overflow-hidden border-r bg-signa-50 lg:block lg:w-1/3">
          <Image
            src="/images/signa-auth-visual.webp"
            alt=""
            fill
            priority
            sizes="33vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_45%,rgba(22,48,79,0.05))]"
          />
        </div>
      </div>
    </main>
  );
}
