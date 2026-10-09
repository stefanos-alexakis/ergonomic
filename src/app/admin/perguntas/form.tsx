"use client";

import { useActionState } from "react";
import { atualizarPesosAction, atualizarPesosEixo2Action, type EstadoPesos } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

type Pergunta = { id: string; texto: string; situacaoInvestigada: string; peso: number; ordemGlobal: number; vaiParaPgr?: boolean };
type Dimensao = { id: string; nome: string; perguntas: Pergunta[] };
type Bloco = { id: string; nome: string; dimensoes: Dimensao[] };

export function PesosForm({ blocos, eixo = 1 }: { blocos: Bloco[]; eixo?: 1 | 2 }) {
  const [estado, formAction, pendente] = useActionState<EstadoPesos, FormData>(
    eixo === 2 ? atualizarPesosEixo2Action : atualizarPesosAction,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {blocos.map((bloco) => (
        <section key={bloco.id}>
          <h2 className="text-lg font-bold text-zinc-900 mb-4">{bloco.nome}</h2>
          <div className="flex flex-col gap-6">
            {bloco.dimensoes.map((dimensao) => (
              <div key={dimensao.id} className="rounded-lg border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">{dimensao.nome}</h3>
                <div className="flex flex-col">
                  {dimensao.perguntas.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 py-3 ${i > 0 ? "border-t border-zinc-100" : ""}`}
                    >
                      <div className="flex-1 text-sm text-zinc-700">
                        <span className="text-zinc-400">{p.ordemGlobal}.</span> {p.texto}
                        <span className="block text-xs text-zinc-400">Situação: {p.situacaoInvestigada}</span>
                      </div>
                      {eixo === 1 && (
                        <label
                          className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer"
                          title="Situação inerente à função: vai para o PGR quando o índice final dela no setor passar de 3,00"
                        >
                          <input
                            type="checkbox"
                            name={`pgr_${p.id}`}
                            defaultChecked={p.vaiParaPgr}
                            className="h-4 w-4 cursor-pointer"
                            aria-label={`Vai para o PGR: ${p.situacaoInvestigada}`}
                          />
                          PGR
                        </label>
                      )}
                      <Input
                        type="number"
                        name={`peso_${p.id}`}
                        defaultValue={p.peso}
                        min={0.1}
                        step={0.1}
                        required
                        className="w-24 text-right"
                        aria-label={`Peso da pergunta: ${p.texto}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      {estado?.sucesso && <p className="text-sm text-emerald-700">{eixo === 1 ? "Pesos e situações do PGR salvos." : "Pesos salvos."}</p>}

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : eixo === 1 ? "Salvar pesos e PGR" : "Salvar pesos"}
        </Button>
      </div>
    </form>
  );
}
