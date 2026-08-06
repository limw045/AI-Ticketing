import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Internal Staff Ticketing System",
  description: "Modern internal ticketing & support platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-mac-bg text-zinc-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
