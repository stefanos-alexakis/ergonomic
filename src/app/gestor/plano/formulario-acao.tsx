"use client";

import { useActionState, useMemo } from "react";
import { criarAcaoAction, salvarAcaoAction, type EstadoForm } from "./actions";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { LIMITES } from "@/lib/plano-acao-util";

export type ValoresAcao = {
  oque: string;
  porque: string;
  como: string;
  responsavel: string;
  cargoResponsavel: string;
  inicio: string;
  prazo: string;
  reavaliarEm: string;
  custo: string;
  custoObservacao: string;
  dimensaoId: string;
  setorIds: string[];
};

function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-zinc-700">
        {rotulo}
        {dica && <span className="font-normal text-zinc-400"> · {dica}</span>}
      </span>
      {children}
    </label>
  );
}

/** Formulário 5W2H — o mesmo para criar e editar. */
export function FormularioAcao({
  acaoId,
  versao,
  valores,
  setores,
  fatores,
  somenteLeitura,
  questaoEixo2Id,
}: {
  questaoEixo2Id?: string;
  acaoId?: string;
  versao?: string;
  valores: ValoresAcao;
  setores: { id: string; nome: string }[];
  fatores: { id: string; nome: string }[];
  somenteLeitura?: boolean;
}) {
  const acao = useMemo(() => (acaoId ? salvarAcaoAction.bind(null, acaoId) : criarAcaoAction), [acaoId]);
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {versao && <input type="hidden" name="versao" value={versao} />}
      {questaoEixo2Id && <input type="hidden" name="questaoEixo2Id" value={questaoEixo2Id} />}
      <fieldset disabled={somenteLeitura || pendente} className="flex flex-col gap-5">
        <Campo rotulo="O quê" dica="a ação">
          <Textarea name="oque" defaultValue={valores.oque} required minLength={3} maxLength={LIMITES.oque} rows={2} />
        </Campo>
        <Campo rotulo="Por quê" dica="justificativa além do fator e da prioridade">
          <Textarea name="porque" defaultValue={valores.porque} maxLength={LIMITES.textoLongo} rows={2} />
        </Campo>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo rotulo="Fator" dica="dimensão do questionário">
            <Select name="dimensaoId" defaultValue={valores.dimensaoId}>
              <option value="">Sem fator específico</option>
              {fatores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-semibold text-zinc-700 mb-1">
              Onde <span className="font-normal text-zinc-400">· setores</span>
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md border border-zinc-200 px-3 py-2 max-h-36 overflow-y-auto">
              {setores.length === 0 && <span className="text-xs text-zinc-400">Cadastre setores em Setores e departamentos.</span>}
              {setores.map((s) => (
                <label key={s.id} className="flex items-center gap-1.5 text-sm text-zinc-700">
                  <input type="checkbox" name="setores" value={s.id} defaultChecked={valores.setorIds.includes(s.id)} />
                  {s.nome}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo rotulo="Quem" dica="responsável">
            <Input name="responsavel" defaultValue={valores.responsavel} maxLength={LIMITES.responsavel} placeholder="Nome" />
          </Campo>
          <Campo rotulo="Cargo do responsável">
            <Input name="cargoResponsavel" defaultValue={valores.cargoResponsavel} maxLength={LIMITES.cargo} />
          </Campo>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Campo rotulo="Quando · início">
            <Input type="date" name="inicio" defaultValue={valores.inicio} />
          </Campo>
          <Campo rotulo="Quando · prazo de conclusão">
            <Input type="date" name="prazo" defaultValue={valores.prazo} />
          </Campo>
          <Campo rotulo="Reavaliar em" dica="verificação de eficácia">
            <Input type="date" name="reavaliarEm" defaultValue={valores.reavaliarEm} />
          </Campo>
        </div>
        <Campo rotulo="Como" dica="etapas, recursos, método">
          <Textarea name="como" defaultValue={valores.como} maxLength={LIMITES.textoLongo} rows={3} />
        </Campo>
        <div className="grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-4">
          <Campo rotulo="Quanto custa (R$)">
            <Input name="custo" defaultValue={valores.custo} inputMode="decimal" placeholder="0,00" />
          </Campo>
          <Campo rotulo="Observação do custo">
            <Input name="custoObservacao" defaultValue={valores.custoObservacao} maxLength={LIMITES.textoLongo} />
          </Campo>
        </div>
      </fieldset>

      {estado?.erro && <FieldError>{estado.erro}</FieldError>}
      {estado?.sucesso && <p className="text-sm text-emerald-700">{estado.sucesso}</p>}
      {!somenteLeitura && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando..." : acaoId ? "Salvar ação" : "Criar ação"}
          </Button>
        </div>
      )}
    </form>
  );
}
