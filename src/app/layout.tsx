import type { Metadata } from "next";
import {
  Fraunces,
  Inter,
  Lora,
  Playfair_Display,
  Source_Sans_3,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Docyfier",
  description: "Turn raw text into polished professional documents.",
};

/**
 * The families behind FONT_PAIRS in `src/lib/themes.ts`. Self-hosted at build
 * time by `next/font` — no runtime fetch, so a document renders and prints the
 * same offline. Each exposes a CSS variable; a theme's font pair is nothing
 * more than two of these variables.
 */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const fontVariables = [
  inter,
  spaceGrotesk,
  sourceSans,
  sourceSerif,
  playfair,
  lora,
  fraunces,
]
  .map((f) => f.variable)
  .join(" ");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
