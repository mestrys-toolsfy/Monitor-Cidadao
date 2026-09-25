import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const campo = "min-h-12 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 text-on-surface";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-on-surface">
      <span className="font-medium">{label}</span>
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
