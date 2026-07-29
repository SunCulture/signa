import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { marketingUrl } from "@/lib/site-config";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(marketingUrl),
  title: {
    default: "Signa | Document signing infrastructure you can own",
    template: "%s | Signa",
  },
  description:
    "Build, send, embed, and verify document signing workflows with a self-hostable platform, REST API, webhooks, audit trails, and PDF trust controls.",
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
  icons: {
    icon: "/images/signa-logo.png",
    apple: "/images/signa-logo.png",
  },
};

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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
