"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/** Grava a preferência de tema no LocalForage. Não mexe em dado de sigilo. */
export function ThemePersistence() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!theme) return;
    void import("@/lib/storage/kv").then(({ setPreference }) => setPreference("tema", theme));
  }, [theme]);

  return null;
}
