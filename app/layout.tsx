import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTMSW AI Department Support | Get Blue Style",
  description: "Editorial Dark AI Support & Request Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0c] text-white antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
