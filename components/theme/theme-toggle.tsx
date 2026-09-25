"use client";

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
  const rotulo = escuro ? "Usar tema claro" : "Usar tema escuro";

  return (
    <button
      type="button"
      className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-outline px-4 text-sm font-semibold text-on-surface"
      aria-label={rotulo}
      onClick={() => setTheme(proximo)}
    >
      {mounted ? rotulo : "Tema"}
    </button>
  );
}
