import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DinkMap — NYC pickleball crowd map",
    template: "%s · DinkMap",
  },
  description:
    "Map NYC public pickleball courts and see live-ish crowd estimates from weather, time, and verified court-side reports.",
  applicationName: "DinkMap",
  keywords: [
    "pickleball",
    "NYC",
    "New York City",
    "courts",
    "outdoor",
    "crowd",
    "map",
  ],
  openGraph: {
    type: "website",
    siteName: "DinkMap",
    title: "DinkMap — NYC pickleball crowd map",
    description:
      "Live-ish crowd reads for NYC public pickleball courts, from weather, time, and verified court-side reports.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DinkMap — NYC pickleball crowd map",
    description: "Live-ish crowd reads for NYC public pickleball courts.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f6f48" },
    { media: "(prefers-color-scheme: dark)", color: "#0a4f33" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
