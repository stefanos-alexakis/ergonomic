"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { salvarPaginaAction, type EstadoFormulario } from "./actions";
import type { PaginaQuestionario } from "@/lib/paginacao-questionario";
import { FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const OPCOES = [
  { valor: 1, rotulo: "Não/Nunca" },
  { valor: 2, rotulo: "Raramente" },
  { valor: 3, rotulo: "Às vezes" },
  { valor: 4, rotulo: "Frequentemente" },
  { valor: 5, rotulo: "Sempre" },
];

export function Questionario({
  workspaceSlug,
  pesquisaSlug,
  respostaId,
  pagina,
  totalPaginas,
  respostasSalvas,
}: {
  workspaceSlug: string;
  pesquisaSlug: string;
  respostaId: string;
  pagina: PaginaQuestionario;
  totalPaginas: number;
  respostasSalvas: Map<string, number>;
}) {
  const ultimaPagina = pagina.numeroPagina === totalPaginas;
  // useMemo é essencial aqui, não só otimização: .bind() cria uma função
  // nova a cada render, e o useActionState do React 19 ficava confuso com
  // a identidade da action mudando — o primeiro "Próximo" de cada página
  // era silenciosamente ignorado, só o segundo clique funcionava (achado
  // no E2E desta fase, ver review.md).
  const acao = useMemo(
    () => salvarPaginaAction.bind(null, workspaceSlug, pesquisaSlug, respostaId, pagina.numeroPagina),
    [workspaceSlug, pesquisaSlug, respostaId, pagina.numeroPagina],
  );
  const [estado, formAction, pendente] = useActionState<EstadoFormulario, FormData>(acao, undefined);
  const progresso = Math.round((pagina.numeroPagina / totalPaginas) * 100);

  return (
    <main className="max-w-2xl mx-auto mt-10 px-5 pb-16">
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm text-zinc-500">
            Página {pagina.numeroPagina} de {totalPaginas}
          </p>
          <p className="text-xs text-zinc-400">{progresso}%</p>
        </div>
        <div className="h-1 w-full bg-[var(--ws-secondary,#f4f4f5)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--ws-accent,#18181b)] rounded-full transition-[width] duration-[420ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mt-4">{pagina.blocoNome}</h2>
      </div>

      {/* o componente inteiro já remonta a cada página (key no page.tsx),
          então anim-fade-up reanima sozinha sem precisar de key aqui. */}
      <form action={formAction} className="flex flex-col anim-fade-up">
        {pagina.perguntas.map((p, i) => (
          <fieldset
            key={p.id}
            className={`border-0 p-0 py-7 ${i > 0 ? "border-t border-[var(--ws-line,#e4e4e7)]" : ""}`}
          >
            <legend className="sr-only">{p.texto}</legend>
            <p className="font-medium text-zinc-900 mb-4 leading-relaxed">
              <span className="text-zinc-400 font-normal">{p.ordemGlobal}.</span> {p.texto}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {OPCOES.map((op) => (
                <label
                  key={op.valor}
                  className="cursor-pointer active:scale-[0.96] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                >
                  <input
                    type="radio"
                    name={`pergunta_${p.id}`}
                    value={op.valor}
                    required
                    defaultChecked={respostasSalvas.get(p.id) === op.valor}
                    className="peer sr-only"
                  />
                  <span className="flex items-center justify-center text-center h-11 px-2 rounded-md border border-zinc-300 text-sm text-zinc-700 transition-colors duration-150 hover:border-zinc-400 peer-checked:bg-[var(--ws-accent,#18181b)] peer-checked:text-white peer-checked:border-[var(--ws-accent,#18181b)] peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2">
                    {op.rotulo}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {estado?.erro && <FieldError>{estado.erro}</FieldError>}

        <div className="flex items-center justify-between pt-6 mt-2 border-t border-[var(--ws-line,#e4e4e7)]">
          {pagina.numeroPagina > 1 ? (
            <Link
              href={`/p/${workspaceSlug}/${pesquisaSlug}?pagina=${pagina.numeroPagina - 1}`}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              ← Voltar
            </Link>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={pendente}>
            {pendente ? "Enviando..." : ultimaPagina ? "Concluir a pesquisa" : "Próximo"}
          </Button>
        </div>
      </form>
    </main>
  );
}
