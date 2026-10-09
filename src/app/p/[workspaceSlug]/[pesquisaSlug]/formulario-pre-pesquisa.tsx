"use client";

import { useActionState, useMemo } from "react";
import { salvarPrePesquisaAction, type EstadoFormulario } from "./actions";
import { Button } from "@/components/ui/button";
import { PERGUNTAS_PRE_PESQUISA, PRE_PESQUISA } from "@/lib/pre-pesquisa";

/** Pré-pesquisa de perfil: obrigatória — todas as perguntas exigem resposta, sem "Pular". */
export function FormularioPrePesquisa({ workspaceSlug, pesquisaSlug }: { workspaceSlug: string; pesquisaSlug: string }) {
  // useMemo evita recriar a action a cada render — ver nota em questionario.tsx.
  const acao = useMemo(() => salvarPrePesquisaAction.bind(null, workspaceSlug, pesquisaSlug), [workspaceSlug, pesquisaSlug]);
  const [estado, formAction, pendente] = useActionState<EstadoFormulario, FormData>(acao, undefined);
  // Num erro, as marcações voltam (o React 19 limpa o formulário a cada envio).
  const v = estado?.valores ?? {};

  return (
    <main className="max-w-lg mx-auto mt-14 mb-16 px-5">
      <h1 className="text-xl font-semibold text-zinc-900 mb-1">{PRE_PESQUISA.titulo}</h1>
      <p className="text-sm text-zinc-500 mb-6">{PRE_PESQUISA.aviso}</p>
      <form action={formAction} className="flex flex-col gap-6 rounded-lg border border-[var(--ws-line,#e4e4e7)] p-6 anim-fade-up">
        {PERGUNTAS_PRE_PESQUISA.map((p) => (
          <fieldset key={p.chave} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-zinc-900">
              {p.chamada && <span className="block text-zinc-500 font-normal">{p.chamada}</span>}
              {p.numero}. {p.pergunta}
            </legend>
            {p.opcoes.map((o) => (
              <label key={o.valor} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                <input
                  type="radio"
                  name={p.chave}
                  value={o.valor}
                  required
                  defaultChecked={v[p.chave] === o.valor}
                  className="h-4 w-4 cursor-pointer"
                />
                {o.rotulo}
              </label>
            ))}
          </fieldset>
        ))}
        {estado?.erro && (
          <p role="alert" className="text-sm text-red-700">
            {estado.erro}
          </p>
        )}
        <Button type="submit" disabled={pendente} className="w-full sm:w-auto sm:self-end">
          {pendente ? "Salvando..." : "Continuar para o questionário"}
        </Button>
      </form>
    </main>
  );
}
