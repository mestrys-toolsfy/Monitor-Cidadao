import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const campo =
  "min-h-12 w-full rounded border border-outline bg-transparent px-4 text-body-lg text-on-surface outline-none focus-visible:border-primary disabled:border-outline-variant disabled:bg-surface-container-highest disabled:text-on-surface-variant";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs text-label-lg text-on-surface">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={campo} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={campo} />;
}
