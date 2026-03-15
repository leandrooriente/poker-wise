import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ActiveGroupProvider } from "@/lib/active-group";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Poker Wise - Poker Match Settlement",
  description: "Track and settle poker matches with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={
          inter.className +
          " font-retro-sans min-h-screen bg-[#212529] text-[#fff]"
        }
      >
        <ActiveGroupProvider>
          <div className="nes-main-content">
            <Header />
            <main className="nes-container is-dark nes-mt-2">{children}</main>
            <footer className="nes-mt-4 nes-text-center">
              <p className="nes-text is-disabled">
                Poker Wise © 2026 — Poker match settlement
              </p>
            </footer>
          </div>
        </ActiveGroupProvider>
      </body>
    </html>
  );
}
