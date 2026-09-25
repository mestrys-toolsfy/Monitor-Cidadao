"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Landmark, LayoutDashboard, LogIn, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const DESTINOS = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/linha-do-tempo", rotulo: "Linha do tempo", icone: ScrollText },
  { href: "/bancada", rotulo: "Bancada", icone: Landmark },
  { href: "/painel", rotulo: "Painel", icone: LayoutDashboard },
  { href: "/entrar", rotulo: "Entrar", icone: LogIn },
] as const;

function ativo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  const links = DESTINOS.map((destino) => {
    const Icone = destino.icone;
    const ligado = ativo(pathname, destino.href);
    return (
      <Link
        key={destino.href}
        href={destino.href}
        aria-current={ligado ? "page" : undefined}
        className={cn(
          "inline-flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-medium text-on-surface md:flex-row md:justify-start md:gap-3 md:px-4 md:text-sm",
          ligado && "bg-primary-container text-on-primary-container",
        )}
      >
        <Icone aria-hidden="true" className="size-5 shrink-0" />
        <span>{destino.rotulo}</span>
      </Link>
    );
  });

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-outline-variant bg-surface-container md:flex md:flex-col md:py-4">
        <nav aria-label="Seções do Monitor Cidadão" className="flex flex-col gap-1">
          {links}
        </nav>
      </aside>
      <nav
        aria-label="Seções do Monitor Cidadão"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-outline-variant bg-surface-container md:hidden"
      >
        {links}
      </nav>
    </>
  );
}
