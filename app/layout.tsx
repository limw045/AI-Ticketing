import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTMSW AI Department Support",
  description: "Porcelain Clean Light Apple/Stripe-level UI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-[#fcfcfc] text-zinc-950 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
