import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-200 bg-white p-5", className)}
      {...props}
    />
  );
}

export function Fieldset({
  legend,
  children,
  className,
}: {
  legend: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("flex flex-col gap-4 border-0 p-0 m-0", className)}>
      <legend className="text-sm font-semibold text-zinc-900 mb-1 px-0">{legend}</legend>
      {children}
    </fieldset>
  );
}
