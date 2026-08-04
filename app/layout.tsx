import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operations Report",
  description: "Monthly operations report across all teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
