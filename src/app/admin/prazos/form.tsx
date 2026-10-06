"use client";

import { useActionState } from "react";
import { salvarPrazosAction, type EstadoPrazos } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import type { Prioridade, RegrasPrazo } from "@/lib/fmea";

const LINHAS: { p: Prioridade; rotulo: string }[] = [
  { p: "ALTA", rotulo: "Alta" },
  { p: "MEDIA", rotulo: "Média" },
  { p: "BAIXA", rotulo: "Baixa" },
];

export function PrazosForm({ regras }: { regras: RegrasPrazo }) {
  const [estado, formAction, pendente] = useActionState<EstadoPrazos, FormData>(salvarPrazosAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="text-left font-medium py-2">Prioridade</th>
            <th className="text-left font-medium py-2">Plano de ação (dias)</th>
            <th className="text-left font-medium py-2">Medidas implantadas (dias)</th>
            <th className="text-left font-medium py-2">Reavaliar (meses)</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS.map(({ p, rotulo }) => (
            <tr key={p} className="border-t border-zinc-100">
              <td className="py-2 font-medium text-zinc-900">{rotulo}</td>
              <td className="py-2 pr-3">
                <Input type="number" name={`plano_${p}`} min={1} max={730} defaultValue={regras[p].planoDias ?? ""} aria-label={`Plano de ação (dias) — ${rotulo}`} placeholder="—" />
              </td>
              <td className="py-2 pr-3">
                <Input type="number" name={`implantacao_${p}`} min={1} max={730} defaultValue={regras[p].implantacaoDias ?? ""} aria-label={`Medidas implantadas (dias) — ${rotulo}`} placeholder="—" />
              </td>
              <td className="py-2">
                <Input type="number" name={`reavaliacao_${p}`} min={1} max={24} required defaultValue={regras[p].reavaliacaoMeses} aria-label={`Reavaliar (meses) — ${rotulo}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      {estado?.sucesso && <p className="text-sm text-emerald-700">Prazos salvos.</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar prazos"}
        </Button>
      </div>
    </form>
  );
}
