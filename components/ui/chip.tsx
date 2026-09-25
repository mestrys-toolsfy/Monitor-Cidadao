import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const formato =
  "inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full px-4 text-label-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Filter chip. O seletor ativo usa o recipiente secundário. */
export function Chip({
  selected = false,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        formato,
        selected
          ? "bg-secondary-container text-on-secondary-container"
          : "border border-outline bg-transparent text-on-surface",
        className,
      )}
      {...props}
    />
  );
}

const TONS = {
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "border border-tertiary bg-tertiary-container text-on-tertiary-container",
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
  neutro: "border border-outline bg-transparent text-on-surface",
} as const;

/** Chip de estado, sem ação. */
export function StatusChip({
  children,
  tone = "secondary",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONS;
  className?: string;
}) {
  return <span className={cn(formato, "w-fit", TONS[tone], className)}>{children}</span>;
}
