import type { Metadata } from "next";
import { Press_Start_2P, Courier_Prime } from "next/font/google";

import "./globals.css";
import Header from "@/components/Header";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const retroFont = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-retro-sans",
});

export const metadata: Metadata = {
  title: "Poker Wise",
  description: "Poker match organizer and settlement app",
  themeColor: "#006600",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Poker Wise",
    statusBarStyle: "black-translucent",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${retroFont.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-retro-dark text-retro-light font-retro-sans">
        <div className="relative max-w-4xl mx-auto p-4">
          <Header />
          <main className="mt-6">{children}</main>
          <footer className="mt-12 text-center text-retro-gray text-sm border-t border-retro-gray pt-4">
             <p>Poker Wise © 2026 — Poker match settlement</p>
             <p className="text-xs mt-1">No backend • No tracking</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
