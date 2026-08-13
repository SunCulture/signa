import type { Metadata } from "next";

import {
  AlternativesSection,
  HeroSection,
  MainSections,
  PricingSection,
  SiteFooter,
} from "@/components/marketing/landing-sections";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <div className="site-gutter">
        <main id="main-content" tabIndex={-1}>
          <HeroSection />
          <MainSections />
          <AlternativesSection />
          <PricingSection />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
