import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Barlow_Condensed, Inter_Tight } from "next/font/google";
import "./globals.css";

const headingFont = Barlow_Condensed({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const bodyFont = Inter_Tight({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fixture Mundial 2026",
  description:
    "Fixture interactivo del Mundial 2026 con grupos, mejores terceros y cuadro final compartible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
