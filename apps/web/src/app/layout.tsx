import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synthesis",
  description: "Capture and organize UI references",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
