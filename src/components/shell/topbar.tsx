import Link from "next/link";
import { sair } from "@/lib/auth-actions";

export function Topbar({
  contexto,
  homeHref,
  userLabel,
  nav,
}: {
  contexto: string;
  homeHref: string;
  userLabel?: string;
  nav: { href: string; label: string }[];
}) {
  return (
    <header className="border-b border-[var(--ws-line,#e4e4e7)] bg-white">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href={homeHref}
            className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 hover:text-zinc-600 transition-colors"
          >
            <span aria-hidden="true">←</span> Pesquisa Psicossocial
          </Link>
          <span className="text-xs text-zinc-400">/</span>
          <span className="text-sm text-zinc-500">{contexto}</span>
          <nav className="flex items-center gap-4 ml-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {userLabel && <span className="text-sm text-zinc-500">{userLabel}</span>}
          <form action={sair}>
            <button
              type="submit"
              className="text-sm text-zinc-600 hover:text-zinc-900 cursor-pointer transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
