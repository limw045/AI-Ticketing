import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internal Staff Support Portal",
  description: "Bright & friendly internal ticketing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
