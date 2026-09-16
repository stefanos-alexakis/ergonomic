"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { concluirAction } from "./actions";
import { Button } from "@/components/ui/button";

type BlocoRevisao = {
  blocoNome: string;
  itens: { perguntaId: string; texto: string; valor: number | undefined; pagina: number; ordemGlobal: number }[];
};

const ROTULO_VALOR: Record<number, string> = {
  1: "Não/Nunca",
  2: "Raramente",
  3: "Às vezes",
  4: "Frequentemente",
  5: "Sempre",
};

export function Revisao({
  workspaceSlug,
  pesquisaSlug,
  respostaId,
  blocos,
}: {
  workspaceSlug: string;
  pesquisaSlug: string;
  respostaId: string;
  blocos: BlocoRevisao[];
}) {
  const [pendente, startTransition] = useTransition();
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  return (
    <main className="max-w-2xl mx-auto mt-10 px-5 pb-16 anim-fade-up">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">Revisar suas respostas</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Você gostaria de revisar suas respostas ou quer concluir a pesquisa?
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {blocos.map((bloco) => {
          const aberto = abertos[bloco.blocoNome] ?? false;
          return (
            <div key={bloco.blocoNome} className="rounded-lg border border-[var(--ws-line,#e4e4e7)]">
              <button
                type="button"
                aria-expanded={aberto}
                onClick={() => setAbertos((s) => ({ ...s, [bloco.blocoNome]: !aberto }))}
                className="w-full flex items-center justify-between cursor-pointer select-none font-semibold text-zinc-900 px-4 py-3"
              >
                {bloco.blocoNome}
                <span className="text-zinc-400 font-normal">{aberto ? "−" : "+"}</span>
              </button>
              <div className={`accordion-content ${aberto ? "aberto" : ""}`}>
                <div className="accordion-inner">
                  <ul className="px-4 pb-4 flex flex-col">
                    {bloco.itens.map((item, i) => (
                      <li
                        key={item.perguntaId}
                        className={`flex items-start justify-between gap-3 py-3 text-sm ${i > 0 ? "border-t border-zinc-100" : ""}`}
                      >
                        <span className="text-zinc-700">
                          <span className="text-zinc-400">{item.ordemGlobal}.</span> {item.texto}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          <strong className="text-zinc-900 whitespace-nowrap">
                            {item.valor ? ROTULO_VALOR[item.valor] : "sem resposta"}
                          </strong>
                          <Link
                            href={`/p/${workspaceSlug}/${pesquisaSlug}?pagina=${item.pagina}`}
                            className="text-zinc-500 hover:text-zinc-900 whitespace-nowrap"
                          >
                            editar
                          </Link>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-6">
        <Link href={`/p/${workspaceSlug}/${pesquisaSlug}?pagina=1`} className="text-sm text-zinc-600 hover:text-zinc-900">
          Revisar do início
        </Link>
        <Button
          disabled={pendente}
          onClick={() => startTransition(() => concluirAction(workspaceSlug, pesquisaSlug, respostaId))}
        >
          {pendente ? "Enviando..." : "Concluir a pesquisa"}
        </Button>
      </div>
    </main>
  );
}
