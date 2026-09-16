import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 " +
  "placeholder:text-zinc-400 transition-colors duration-150 " +
  "hover:border-zinc-400 " +
  "focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-0 focus:border-zinc-900 " +
  "disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_BASE, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD_BASE, "h-auto min-h-20 py-2", className)} {...props} />;
}
