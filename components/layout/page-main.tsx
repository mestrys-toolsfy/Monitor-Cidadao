import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Margens e calhas do DESIGN.md: 16 / 24 / 32 px, miolo até 1200 px. */
export const faixaPagina =
  "mx-auto w-full max-w-[1200px] px-margin tablet:px-margin-tablet desktop:px-margin-desktop";

export function PageMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn(faixaPagina, "flex flex-1 flex-col gap-gutter py-xl tablet:gap-gutter-tablet", className)}>
      {children}
    </main>
  );
}
