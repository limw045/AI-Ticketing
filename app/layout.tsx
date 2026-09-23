import "./globals.css";
import { Geist } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "@/app/theme";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: { url: "/brand/ticketing-icon-transparent.png", sizes: "1254x1254", type: "image/png" },
    apple: { url: "/brand/ticketing-apple-icon.png", sizes: "180x180", type: "image/png" },
  },
  title: "Grant Thornton AI Department | Support Desk",
  description:
    "Internal ticketing and case tracking for Grant Thornton automations. Automated services report issues with logs and context, and every case stays traceable to resolution.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("gt-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`,
          }}
        />
      </head>
      <body className={`${geist.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
