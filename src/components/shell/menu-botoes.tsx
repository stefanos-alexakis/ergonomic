"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconeNav } from "./icones-nav";
import { itemAtivo, type GrupoNav, type ItemNav } from "./nav-gestor";

/**
 * Faixa de botões do menu. O botão da página atual fica preenchido com a
 * cor primária da empresa; os demais ficam brancos com o texto na cor
 * primária e ganham um tom dela no hover. Sem cor cadastrada, cai no
 * cinza-escuro padrão (mesmo fallback do <Button>).
 */
export function MenuBotoes({ itens, grupos = [], raiz }: { itens: ItemNav[]; grupos?: GrupoNav[]; raiz: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // No celular a faixa rola de lado: traz o botão da página atual para a vista.
  useEffect(() => {
    navRef.current
      ?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  return (
    <nav ref={navRef} aria-label="Menu principal" className="flex gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible py-2.5 -mx-1 px-1">
      {grupos.length > 0 && <GavetaMenu grupos={grupos} raiz={raiz} />}
      {itens.map((item) => {
        const ativo = itemAtivo(item, pathname, raiz);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 h-9 text-sm font-medium whitespace-nowrap",
              "transition-[background-color,color,box-shadow] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-accent,#18181b)] focus-visible:ring-offset-2",
              ativo
                ? "border-[var(--ws-accent,#18181b)] bg-[var(--ws-accent,#18181b)] text-[var(--ws-on-accent,#ffffff)] shadow-sm"
                : "border-[color-mix(in_srgb,var(--ws-accent,#18181b)_25%,white)] bg-white text-[var(--ws-accent,#3f3f46)] hover:bg-[color-mix(in_srgb,var(--ws-accent,#18181b)_10%,white)]",
            )}
          >
            <IconeNav nome={item.icone} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Botão "Menu" + gaveta pela esquerda com os demais itens, por categoria.
 * Fecha com Esc, clique fora, no X ou ao escolher um item; o foco volta ao botão.
 */
function GavetaMenu({ grupos, raiz }: { grupos: GrupoNav[]; raiz: string }) {
  const pathname = usePathname();
  const [aberta, setAberta] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  // O botão fica no estilo "ativo" quando a página atual mora na gaveta.
  const paginaNaGaveta = grupos.some((g) => g.itens.some((i) => itemAtivo(i, pathname, raiz)));

  useEffect(() => {
    if (!aberta) return;
    fecharRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberta(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    // Impede a página de rolar por trás da gaveta.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflow;
    };
  }, [aberta]);

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberta(true)}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 h-9 text-sm font-medium whitespace-nowrap cursor-pointer",
          "transition-[background-color,color,box-shadow] duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-accent,#18181b)] focus-visible:ring-offset-2",
          paginaNaGaveta
            ? "border-[var(--ws-accent,#18181b)] bg-[var(--ws-accent,#18181b)] text-[var(--ws-on-accent,#ffffff)] shadow-sm"
            : "border-[color-mix(in_srgb,var(--ws-accent,#18181b)_25%,white)] bg-white text-[var(--ws-accent,#3f3f46)] hover:bg-[color-mix(in_srgb,var(--ws-accent,#18181b)_10%,white)]",
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Menu
      </button>

      {aberta && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 anim-fade-in" onClick={() => setAberta(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl flex flex-col anim-drawer-left"
          >
            <div className="h-1 bg-[var(--ws-accent,#18181b)]" />
            <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200">
              <span className="text-sm font-semibold text-zinc-900">Menu</span>
              <button
                ref={fecharRef}
                type="button"
                onClick={() => {
                  setAberta(false);
                  botaoRef.current?.focus();
                }}
                aria-label="Fechar menu"
                className="h-9 w-9 grid place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Menu lateral" className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
              {grupos.map((g) => (
                <div key={g.titulo}>
                  <p className="px-2 mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">{g.titulo}</p>
                  <ul className="flex flex-col gap-1">
                    {g.itens.map((item) => {
                      const ativo = itemAtivo(item, pathname, raiz);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={ativo ? "page" : undefined}
                            onClick={() => setAberta(false)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 h-10 text-sm font-medium",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-accent,#18181b)]",
                              ativo
                                ? "bg-[var(--ws-accent,#18181b)] text-[var(--ws-on-accent,#ffffff)]"
                                : "text-zinc-700 hover:bg-[color-mix(in_srgb,var(--ws-accent,#18181b)_10%,white)]",
                            )}
                          >
                            <IconeNav nome={item.icone} />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
