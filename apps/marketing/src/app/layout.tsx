import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { JsonLd } from "@/components/seo/json-ld";
import { marketingUrl } from "@/lib/site-config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(marketingUrl),
  applicationName: "Signa",
  title: {
    default: "Signa | Document signing infrastructure you can own",
    template: "%s | Signa",
  },
  description:
    "Build, send, embed, and verify document signing workflows with a self-hostable platform, REST API, webhooks, audit trails, and PDF trust controls.",
  manifest: "/manifest.webmanifest",
  creator: "Signa",
  publisher: "Signa",
  category: "technology",
  openGraph: {
    title: "Document signing infrastructure you can own",
    description:
      "Build, send, embed, and verify signing workflows with Signa.",
    siteName: "Signa",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Document signing infrastructure you can own",
    description:
      "Build, send, embed, and verify signing workflows with Signa.",
  },
  appleWebApp: {
    capable: true,
    title: "Signa",
    statusBarStyle: "default",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#102852",
};

const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${marketingUrl}/#organization`,
    name: "Signa",
    url: marketingUrl,
    logo: `${marketingUrl}/icons/signa-512.png`,
    sameAs: ["https://github.com/codeignite-labs/signa"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${marketingUrl}/#website`,
    name: "Signa",
    url: marketingUrl,
    description:
      "Self-hosted document signing infrastructure, APIs, embeds, audit evidence, and PDF trust controls.",
    publisher: {
      "@id": `${marketingUrl}/#organization`,
    },
    inLanguage: "en",
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} scroll-smooth antialiased`}
    >
      <body className="min-h-screen">
        <JsonLd data={siteJsonLd} />
        {children}
      </body>
    </html>
  );
}
