import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ORBITAL INTERCEPT // Satellite Tasking Console",
  description:
    "Cyber-intel satellite tasking CTF. Analyze SAR & optical providers, beat the clock, task the intercept.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="space-bg" />
        <div className="grid-overlay" />
        {children}
        <div className="vignette" />
        <div className="scanlines" />
      </body>
    </html>
  );
}
