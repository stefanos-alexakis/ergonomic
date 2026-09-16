import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

// bg/border usam --ws-accent (setado pelo AppShell/layout da jornada quando
// a empresa tem cor cadastrada); o fallback #18181b é o mesmo hex de
// zinc-900, então sem cor cadastrada o botão fica idêntico ao visual atual.
const VARIANTS: Record<Variant, string> = {
  primary: "bg-[var(--ws-accent,#18181b)] text-white border border-[var(--ws-accent,#18181b)] hover:opacity-90",
  secondary: "bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50",
  ghost: "bg-transparent text-zinc-600 border border-transparent hover:bg-zinc-100",
  danger: "bg-white text-red-600 border border-zinc-300 hover:bg-red-50 hover:border-red-200",
};

export function Button({
  variant = "primary",
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 h-9 text-sm font-medium cursor-pointer",
        "transition-[transform,opacity,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANTS[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
