import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Docyfier",
  description: "Turn raw text into polished professional documents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
