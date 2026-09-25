"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { faixaPagina } from "@/components/layout/page-main";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

/** TopAppBar centralizada. Na página inicial, o título médio recolhe ao rolar. */
export function TopAppBar() {
  const pathname = usePathname();
  const inicio = pathname === "/";
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRecolhida(window.scrollY > 24);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, [pathname]);

  const expandida = inicio && !recolhida;

  return (
    <header className="sticky top-0 z-30 bg-surface-dim">
      <div className={cn(faixaPagina, "grid h-16 grid-cols-[1fr_auto_1fr] items-center")}>
        <div />
        {expandida ? (
          <div />
        ) : inicio ? (
          <h1 className="text-center text-label-lg text-on-surface">Monitor Cidadão</h1>
        ) : (
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center text-center text-label-lg text-on-surface"
          >
            Monitor Cidadão
          </Link>
        )}
        <div className="justify-self-end">
          <ThemeToggle />
        </div>
      </div>
      {expandida ? (
        <div className={cn(faixaPagina, "pb-4")}>
          <h1 className="text-center text-headline-lg text-on-surface">Monitor Cidadão</h1>
        </div>
      ) : null}
    </header>
  );
}
