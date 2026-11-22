"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { salvarSugestaoAction, type EstadoFormulario } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import { LIMITE_SUGESTAO, PERGUNTA_SUGESTAO } from "@/lib/sugestao-melhoria";

/** Última página: pergunta aberta opcional. "Concluir a pesquisa" fica livre mesmo sem texto. */
export function FormularioSugestao({
  workspaceSlug,
  pesquisaSlug,
  numeroPagina,
  totalPaginas,
}: {
  workspaceSlug: string;
  pesquisaSlug: string;
  numeroPagina: number;
  totalPaginas: number;
}) {
  // useMemo evita recriar a action a cada render — ver nota em questionario.tsx.
  const acao = useMemo(() => salvarSugestaoAction.bind(null, workspaceSlug, pesquisaSlug), [workspaceSlug, pesquisaSlug]);
  const [estado, formAction, pendente] = useActionState<EstadoFormulario, FormData>(acao, undefined);
  // Campo controlado: o React 19 limpa formulários não controlados depois do envio.
  const [texto, setTexto] = useState("");
  const progresso = Math.round((numeroPagina / totalPaginas) * 100);

  return (
    <main className="max-w-2xl mx-auto mt-10 px-5 pb-16">
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm text-zinc-500">
            Página {numeroPagina} de {totalPaginas}
          </p>
          <p className="text-xs text-zinc-400">{progresso}%</p>
        </div>
        <div className="h-1 w-full bg-[var(--ws-secondary,#f4f4f5)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--ws-accent,#18181b)] rounded-full" style={{ width: `${progresso}%` }} />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mt-4">Sua sugestão</h2>
      </div>

      <form action={formAction} className="flex flex-col gap-3 anim-fade-up">
        <label htmlFor="sugestao" className="font-medium text-zinc-900 leading-relaxed">
          {PERGUNTA_SUGESTAO}
        </label>
        <p className="text-sm text-zinc-500">
          Resposta opcional. Escreva com suas palavras e, por favor, não cite nomes de pessoas.
        </p>
        <Textarea
          id="sugestao"
          name="sugestao"
          rows={7}
          maxLength={LIMITE_SUGESTAO}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full"
        />
        <p className="text-xs text-zinc-400 text-right tabular-nums">
          {texto.length}/{LIMITE_SUGESTAO}
        </p>

        {estado?.erro && <FieldError>{estado.erro}</FieldError>}

        <div className="flex items-center justify-between pt-6 mt-2 border-t border-[var(--ws-line,#e4e4e7)]">
          <Link
            href={`/p/${workspaceSlug}/${pesquisaSlug}?pagina=${numeroPagina - 1}`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Voltar
          </Link>
          <Button type="submit" disabled={pendente}>
            {pendente ? "Enviando..." : "Concluir a pesquisa"}
          </Button>
        </div>
      </form>
    </main>
  );
}
