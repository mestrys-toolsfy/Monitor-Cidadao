import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-12 min-w-12",
  {
    variants: {
      variant: {
        filled: "bg-primary text-on-primary hover:opacity-90 focus-visible:outline-primary",
        outlined: "border border-outline bg-transparent text-on-surface hover:bg-surface-container focus-visible:outline-outline",
      },
    },
    defaultVariants: {
      variant: "filled",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} type={asChild ? undefined : type} {...props} />;
}
