"use client";

import { useActionState, useMemo } from "react";
import { importarPlanilhaAction, type EstadoEixo3 } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function EnvioPlanilha({ levantamentoId, jaEnviada }: { levantamentoId: string; jaEnviada: boolean }) {
  const acao = useMemo(() => importarPlanilhaAction.bind(null, levantamentoId), [levantamentoId]);
  const [estado, formAction, pendente] = useActionState<EstadoEixo3, FormData>(acao, undefined);

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <Input
          type="file"
          name="planilha"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          aria-label="Planilha de ocorrências (.xlsx)"
          className="h-auto py-1.5 max-w-sm"
        />
        <Button type="submit" disabled={pendente}>
          {pendente ? "Lendo planilha..." : jaEnviada ? "Substituir planilha" : "Enviar planilha"}
        </Button>
      </form>
      <p className="text-xs text-zinc-500">
        Até 5 MB e 5.000 ocorrências. Colunas reconhecidas pelo nome — use o{" "}
        <a href="/gestor/eixo3/modelo" className="underline">
          modelo da plataforma
        </a>
        .
      </p>

      {estado?.mensagem && <p className="text-sm text-emerald-700">{estado.mensagem}</p>}
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}

      {estado?.erros && estado.erros.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-medium mb-2">{estado.erros.length} problema(s) na planilha:</p>
          <ul className="flex flex-col gap-1 max-h-64 overflow-auto">
            {estado.erros.map((e, i) => (
              <li key={i}>
                {e.linha > 0 ? `Linha ${e.linha}, ${e.coluna}: ` : ""}
                {e.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {estado?.avisos && estado.avisos.length > 0 && (
        <details className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <summary className="cursor-pointer">{estado.avisos.length} aviso(s) — não impedem a publicação</summary>
          <ul className="mt-2 flex flex-col gap-1 max-h-48 overflow-auto">
            {estado.avisos.map((a, i) => (
              <li key={i}>
                {a.linha > 1 ? `Linha ${a.linha}: ` : `Coluna "${a.coluna}": `}
                {a.mensagem}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
