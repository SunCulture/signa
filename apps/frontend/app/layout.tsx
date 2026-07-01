import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "@fontsource/dancing-script/400.css";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signa",
  description: "TypeScript and React document signing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <NextTopLoader
          color="#16304f"
          height={3}
          shadow="0 0 10px rgba(22, 48, 79, 0.35)"
          showSpinner={false}
        />
        <Providers>{children}</Providers>
        <Toaster
          closeButton
          position="bottom-center"
          richColors
          toastOptions={{
            classNames: {
              closeButton: "left-auto! -right-4! -top-1!",
            },
          }}
        />
      </body>
    </html>
  );
}
