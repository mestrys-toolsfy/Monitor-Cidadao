import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardTag = "div" | "article" | "section";

/** Card MD3. Outlined usa contorno; elevated sobe só pela superfície. */
export function Card({
  as: Tag = "div",
  variant = "outlined",
  compact = false,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: CardTag;
  variant?: "outlined" | "elevated";
  compact?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "p-4 text-on-surface",
        compact ? "rounded-lg" : "rounded-xl",
        variant === "outlined" && "border border-outline bg-surface-container-lowest",
        variant === "elevated" &&
          "bg-surface-container-low shadow-[0_1px_3px_color-mix(in_srgb,var(--on-surface)_14%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
