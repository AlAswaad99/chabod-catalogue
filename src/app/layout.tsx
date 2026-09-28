import type { Metadata } from "next";
import { Archivo, Noto_Sans_Ethiopic, JetBrains_Mono } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-noto-ethiopic",
  subsets: ["ethiopic"],
  weight: ["400", "500", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Chabod Choir Catalogue",
  description: "Song lyrics and metadata catalogue for Chabod Choir.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${notoSansEthiopic.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Sets data-theme before first paint so there is no flash — see
            src/lib/theme.ts, which this string must stay in sync with. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="theme-color" content="#0d2124" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
