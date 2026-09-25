import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { AppNav } from "@/components/nav/app-nav";
import { Providers } from "@/components/providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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
            <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
              <header className="border-b border-outline-variant bg-surface-container-high">
                <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-2 md:px-8">
                  <Link className="inline-flex min-h-12 items-center text-lg font-semibold text-on-surface" href="/">
                    Monitor Cidadão
                  </Link>
                  <ThemeToggle />
                </div>
              </header>
              <div className="flex flex-1 flex-col">{children}</div>
              <SiteFooter />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
