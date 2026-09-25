import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { AppNav } from "@/components/nav/app-nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Monitor Cidadão",
  description: "Acompanhe a atividade pública. O voto fica protegido no seu navegador.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className={`${inter.className} flex min-h-full flex-col bg-background text-on-background antialiased`}>
        <Providers>
          <div className="flex min-h-full flex-1">
            <AppNav />
            <div className="flex min-w-0 flex-1 flex-col pb-20 desktop:pb-0">
              <TopAppBar />
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
