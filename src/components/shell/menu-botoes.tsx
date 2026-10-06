"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IconeNav } from "./icones-nav";
import { itemAtivo, type ItemNav } from "./nav-gestor";

/**
 * Faixa de botões do menu. O botão da página atual fica preenchido com a
 * cor primária da empresa; os demais ficam brancos com o texto na cor
 * primária e ganham um tom dela no hover. Sem cor cadastrada, cai no
 * cinza-escuro padrão (mesmo fallback do <Button>).
 */
export function MenuBotoes({ itens, raiz }: { itens: ItemNav[]; raiz: string }) {
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
