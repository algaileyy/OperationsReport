import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Media Operations Report",
  description: "Monthly media operations report across all teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Applies any saved theme choice before first paint, so the input
            pages don't flash the wrong theme on load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ops-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
