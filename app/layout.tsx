import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Courier_Prime } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className="font-retro-sans min-h-screen bg-[#212529] text-[#fff]">
        <Providers>
          <div className="relative mx-auto max-w-4xl p-4">
            <Header />
            <main className="nes-container is-dark mt-6">{children}</main>
            <footer className="mt-12 border-t pt-4 text-center text-sm">
              <p>Poker Wise © 2026 — Poker match settlement</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
