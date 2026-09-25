"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Columns3, Home, Landmark, LayoutDashboard, LogIn, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const DESTINOS = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/linha-do-tempo", rotulo: "Linha do tempo", icone: ScrollText },
  { href: "/bancada", rotulo: "Bancada", icone: Landmark },
  { href: "/painel", rotulo: "Painel", icone: LayoutDashboard },
  { href: "/comparador", rotulo: "Comparador", icone: Columns3 },
  { href: "/entrar", rotulo: "Entrar", icone: LogIn },
] as const;

function ativo(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ItemNav({
  destino,
  pathname,
}: {
  destino: (typeof DESTINOS)[number];
  pathname: string;
}) {
  const Icone = destino.icone;
  const ligado = ativo(pathname, destino.href);
  return (
    <Link
      href={destino.href}
      aria-current={ligado ? "page" : undefined}
      className="inline-flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary desktop:w-full desktop:flex-none"
    >
      <span
        className={cn(
          "flex h-8 w-14 items-center justify-center rounded-full",
          ligado ? "bg-secondary-container text-on-secondary-container" : "text-on-surface-variant",
        )}
      >
        <Icone aria-hidden="true" className="size-6 shrink-0" />
      </span>
      <span
        className={cn(
          "line-clamp-2 w-full wrap-break-word text-center text-label-sm",
          ligado ? "text-on-surface" : "text-on-surface-variant",
        )}
      >
        {destino.rotulo}
      </span>
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden w-20 shrink-0 flex-col bg-surface py-sm desktop:flex">
        <nav aria-label="Seções do Monitor Cidadão" className="flex flex-col gap-sm">
          {DESTINOS.map((destino) => (
            <ItemNav key={destino.href} destino={destino} pathname={pathname} />
          ))}
        </nav>
      </aside>
      <nav
        aria-label="Seções do Monitor Cidadão"
        className="fixed inset-x-0 bottom-0 z-20 flex h-20 items-stretch bg-surface-container-high desktop:hidden"
      >
        {DESTINOS.map((destino) => (
          <ItemNav key={destino.href} destino={destino} pathname={pathname} />
        ))}
      </nav>
    </>
  );
}
