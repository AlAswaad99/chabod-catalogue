import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, Noto_Sans_Ethiopic, Noto_Serif_Ethiopic, JetBrains_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Display type: Fraunces (Latin) with Noto Serif Ethiopic behind it for Ge'ez.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

// UI type: Hanken Grotesk with Noto Sans Ethiopic behind it.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const notoSerifEthiopic = Noto_Serif_Ethiopic({
  variable: "--font-noto-serif-ethiopic",
  subsets: ["ethiopic"],
  display: "swap",
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-noto-sans-ethiopic",
  subsets: ["ethiopic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chabod Choir Catalogue",
  description: "Song lyrics and metadata catalogue for Chabod Choir.",
};

export const viewport: Viewport = {
  themeColor: "#f6f1e6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${notoSerifEthiopic.variable} ${notoSansEthiopic.variable} ${jetbrainsMono.variable} h-full antialiased`}
      // data-theme is set by the inline script below before hydration, so
      // it will always differ from the server-rendered markup — expected,
      // not a real mismatch.
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint so there is no flash — see
            src/lib/theme.ts, which this string must stay in sync with. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-center" offset={{ bottom: 88 }} mobileOffset={{ bottom: 88 }} />
      </body>
    </html>
  );
}
