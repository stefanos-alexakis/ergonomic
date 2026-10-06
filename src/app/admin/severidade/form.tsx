"use client";

import { useActionState } from "react";
import { salvarSeveridadeAction, type EstadoSeveridade } from "./actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

type Item = { dimensaoId: string; nome: string; severidade: number | null; justificativa: string | null };

const ESCALA = [
  "1 · desconforto passageiro",
  "2 · sofrimento leve e reversível",
  "3 · adoecimento com possível afastamento curto",
  "4 · afastamento prolongado ou dano cardiovascular",
  "5 · dano grave, permanente ou com risco à vida",
];

export function SeveridadeForm({ itens }: { itens: Item[] }) {
  const [estado, formAction, pendente] = useActionState<EstadoSeveridade, FormData>(salvarSeveridadeAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {itens.map((item) => (
        <div key={item.dimensaoId} className="rounded-lg border border-zinc-200 p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">{item.nome}</h2>
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              Severidade-base
              <select
                name={`sev_${item.dimensaoId}`}
                defaultValue={item.severidade ?? 3}
                className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900"
                aria-label={`Severidade-base: ${item.nome}`}
              >
                {ESCALA.map((rotulo, i) => (
                  <option key={rotulo} value={i + 1}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            name={`just_${item.dimensaoId}`}
            defaultValue={item.justificativa ?? ""}
            required
            minLength={10}
            maxLength={1000}
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
            aria-label={`Justificativa técnica: ${item.nome}`}
            placeholder="Justificativa técnica (dano típico e evidência)"
          />
          {item.severidade === null && (
            <p className="text-xs text-amber-700">Ainda sem severidade cadastrada: o painel usa 3 até salvar.</p>
          )}
        </div>
      ))}

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      {estado?.sucesso && <p className="text-sm text-emerald-700">Severidades salvas.</p>}

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar severidades"}
        </Button>
      </div>
    </form>
  );
}
