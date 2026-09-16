import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-5 mb-6 border-b border-[var(--ws-line,#e4e4e7)]">
      <div>
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 mb-1">{eyebrow}</p>
        )}
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
