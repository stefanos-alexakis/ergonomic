import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Rótulo + campo + texto auxiliar, com o espaçamento sempre igual —
 * é essa consistência que estava faltando (campos desalinhados). */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-zinc-700", className)} {...props} />;
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-red-600 flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="13.5" r="0.75" fill="currentColor" />
      </svg>
      {children}
    </p>
  );
}

export function FieldSuccess({ children }: { children: ReactNode }) {
  return <p className="text-sm text-emerald-700">{children}</p>;
}
