"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const escuro = mounted && resolvedTheme === "dark";
  const proximo = escuro ? "light" : "dark";
  const rotulo = mounted ? (escuro ? "Usar tema claro" : "Usar tema escuro") : "Tema";

  return (
    <button
      type="button"
      className="inline-flex size-12 items-center justify-center rounded-lg border border-outline text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline"
      aria-label={rotulo}
      onClick={() => setTheme(proximo)}
    >
      {mounted ? (
        escuro ? (
          <Sun aria-hidden="true" className="size-6" />
        ) : (
          <Moon aria-hidden="true" className="size-6" />
        )
      ) : (
        <span className="size-6" aria-hidden="true" />
      )}
    </button>
  );
}
