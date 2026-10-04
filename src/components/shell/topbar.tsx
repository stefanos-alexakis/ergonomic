import Link from "next/link";
import { sair } from "@/lib/auth-actions";
import { MenuBotoes } from "./menu-botoes";
import type { ItemNav } from "./nav-gestor";

/** Iniciais para o selo quando a empresa não tem logo ("Usina X" → "UX"). */
function iniciais(nome: string): string {
  const partes = nome.split(/\s+/).filter((p) => /^[\p{L}\p{N}]/u.test(p));
  return (partes.length > 1 ? partes[0]![0]! + partes[1]![0]! : (partes[0] ?? "?").slice(0, 2)).toUpperCase();
}

export function Topbar({
  contexto,
  homeHref,
  userLabel,
  nav,
  logoUrl,
}: {
  contexto: string;
  homeHref: string;
  userLabel?: string;
  nav: ItemNav[];
  logoUrl?: string | null;
}) {
  return (
    <header className="bg-white border-b border-zinc-200">
      {/* Faixa fina na cor primária da empresa */}
      <div className="h-1 bg-[var(--ws-accent,#18181b)]" />
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between gap-4">
        <Link href={homeHref} className="flex items-center gap-3 min-w-0 group" title="Ir para o início">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo enviado pelo admin, servido de /uploads
            <img
              src={logoUrl}
              alt={`Logo ${contexto}`}
              className="h-10 w-auto max-w-[140px] object-contain shrink-0"
            />
          ) : (
            <span
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-lg grid place-items-center text-sm font-bold bg-[var(--ws-accent,#18181b)] text-[var(--ws-on-accent,#ffffff)]"
            >
              {iniciais(contexto)}
            </span>
          )}
          <span className="flex flex-col min-w-0 leading-tight">
            <span className="text-base font-semibold text-zinc-900 truncate group-hover:text-[var(--ws-accent,#52525b)] transition-colors">
              {contexto}
            </span>
            <span className="text-xs text-zinc-500">Pesquisa Psicossocial · FRPRT</span>
          </span>
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          {userLabel && <span className="hidden sm:inline text-sm text-zinc-500">{userLabel}</span>}
          <form action={sair}>
            <button
              type="submit"
              className="inline-flex items-center h-9 px-3.5 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
      {nav.length > 0 && (
        <div className="bg-[var(--ws-secondary,#f4f4f5)] border-t border-[color-mix(in_srgb,var(--ws-accent,#18181b)_12%,white)]">
          <div className="mx-auto max-w-5xl px-4">
            <MenuBotoes itens={nav} raiz={homeHref} />
          </div>
        </div>
      )}
    </header>
  );
}
