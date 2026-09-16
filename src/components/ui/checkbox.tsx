import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function CheckboxLabel({
  children,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { children: ReactNode }) {
  return (
    <label className={cn("flex items-center gap-2 text-sm text-zinc-700 cursor-pointer select-none", className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0 cursor-pointer"
        {...props}
      />
      {children}
    </label>
  );
}
