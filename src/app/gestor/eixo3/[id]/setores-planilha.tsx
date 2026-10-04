"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolverSetorAction } from "../actions";
import { Select } from "@/components/ui/input";

type Grupo = { setorOriginal: string; setorId: string | null; ignorada: boolean; linhas: number };

const CRIAR = "__criar__";
const IGNORAR = "__ignorar__";

/**
 * Cada nome de setor da planilha, uma vez só: associado automaticamente
 * quando bate com o cadastro; senão o usuário escolhe um setor, cria ou
 * ignora aquelas linhas.
 */
export function SetoresPlanilha({
  levantamentoId,
  grupos,
  setores,
}: {
  levantamentoId: string;
  grupos: Grupo[];
  setores: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aplicar(setorOriginal: string, valor: string) {
    if (!valor) return;
    setErro(null);
    const acao =
      valor === CRIAR
        ? ({ tipo: "criar" } as const)
        : valor === IGNORAR
          ? ({ tipo: "ignorar" } as const)
          : ({ tipo: "associar", setorId: valor } as const);
    startTransition(async () => {
      const r = await resolverSetorAction(levantamentoId, setorOriginal, acao);
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Na planilha</th>
              <th className="px-3 py-2 text-left font-medium">Linhas</th>
              <th className="px-3 py-2 text-left font-medium">Setor na plataforma</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => {
              const pendenteGrupo = !g.setorId && !g.ignorada;
              const valor = g.ignorada ? IGNORAR : (g.setorId ?? "");
              return (
                <tr key={g.setorOriginal} className={`border-t border-zinc-100 ${pendenteGrupo ? "bg-amber-50" : ""}`}>
                  <td className="px-3 py-2 font-medium text-zinc-800">{g.setorOriginal}</td>
                  <td className="px-3 py-2 text-zinc-600">{g.linhas}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={valor}
                      disabled={pendente}
                      onChange={(e) => aplicar(g.setorOriginal, e.target.value)}
                      aria-label={`Setor para "${g.setorOriginal}"`}
                      className={`w-72 ${pendenteGrupo ? "border-amber-400" : ""}`}
                    >
                      {pendenteGrupo && <option value="">Escolha…</option>}
                      {setores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                      <option value={CRIAR}>+ Criar setor &quot;{g.setorOriginal}&quot;</option>
                      <option value={IGNORAR}>Ignorar estas linhas</option>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
