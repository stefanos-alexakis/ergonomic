"use client";

import { useActionState, useMemo } from "react";
import { andamentoAction, gerarDoEixo2Action, mudarFaseAction, verificarAction, type EstadoForm } from "./actions";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field";
import { EFICACIAS, FASES, LIMITES, type Eficacia, type Fase } from "@/lib/plano-acao-util";

function Mensagem({ estado }: { estado: EstadoForm }) {
  if (estado?.erro) return <FieldError>{estado.erro}</FieldError>;
  if (estado?.sucesso) return <p className="text-sm text-emerald-700">{estado.sucesso}</p>;
  return null;
}

const ROTULO_BOTAO: Partial<Record<Fase, Partial<Record<Fase, string>>>> = {
  PLANEJAR: { EXECUTAR: "Iniciar execução (D)", CANCELADA: "Cancelar ação" },
  EXECUTAR: { VERIFICAR: "Enviar para verificação (C)", PLANEJAR: "Voltar ao planejamento", CANCELADA: "Cancelar ação" },
  VERIFICAR: { EXECUTAR: "Voltar à execução" },
  CONCLUIDA: { VERIFICAR: "Reabrir verificação" },
  CANCELADA: { PLANEJAR: "Reativar ação" },
};

/** Botões das transições permitidas do PDCA. */
export function BotoesFase({ acaoId, versao, fase, transicoes }: { acaoId: string; versao: string; fase: Fase; transicoes: Fase[] }) {
  const acao = useMemo(() => mudarFaseAction.bind(null, acaoId), [acaoId]);
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="versao" value={versao} />
      <div className="flex flex-wrap gap-2">
        {transicoes.map((t) => (
          <Button
            key={t}
            type="submit"
            name="fase"
            value={t}
            variant={t === "CANCELADA" ? "danger" : t === "EXECUTAR" && fase === "PLANEJAR" ? "primary" : t === "VERIFICAR" && fase === "EXECUTAR" ? "primary" : "secondary"}
            disabled={pendente}
          >
            {ROTULO_BOTAO[fase]?.[t] ?? FASES[t].rotulo}
          </Button>
        ))}
      </div>
      <Mensagem estado={estado} />
    </form>
  );
}

export function FormAndamento({ acaoId, versao, percentual }: { acaoId: string; versao: string; percentual: number }) {
  const acao = useMemo(() => andamentoAction.bind(null, acaoId), [acaoId]);
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="versao" value={versao} />
      <label className="flex items-center gap-3 text-sm">
        <span className="text-xs font-semibold text-zinc-700 w-24">Andamento</span>
        <input type="range" name="percentual" min={0} max={100} step={5} defaultValue={percentual} className="flex-1" aria-label="Percentual de andamento" />
      </label>
      <Textarea name="nota" placeholder="Anotação de andamento (opcional)" maxLength={LIMITES.nota} rows={2} />
      <div className="flex items-center justify-between gap-3">
        <Mensagem estado={estado} />
        <Button type="submit" variant="secondary" disabled={pendente}>
          Registrar andamento
        </Button>
      </div>
    </form>
  );
}

export function FormVerificacao({ acaoId, versao }: { acaoId: string; versao: string }) {
  const acao = useMemo(() => verificarAction.bind(null, acaoId), [acaoId]);
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="versao" value={versao} />
      <fieldset className="flex flex-wrap gap-4">
        <legend className="text-xs font-semibold text-zinc-700 mb-2">Eficácia da ação</legend>
        {(Object.keys(EFICACIAS) as Eficacia[]).map((e) => (
          <label key={e} className="flex items-center gap-1.5 text-sm text-zinc-800">
            <input type="radio" name="eficacia" value={e} required />
            {EFICACIAS[e].rotulo}
          </label>
        ))}
      </fieldset>
      <Textarea name="verificacao" placeholder="Como a eficácia foi verificada (evidências, comparação antes × depois)" maxLength={LIMITES.textoLongo} rows={3} />
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="corretiva" defaultChecked />
        Se parcial ou ineficaz, abrir ação corretiva ligada a esta (Agir · A)
      </label>
      <div className="flex items-center justify-between gap-3">
        <Mensagem estado={estado} />
        <Button type="submit" disabled={pendente}>
          Registrar verificação
        </Button>
      </div>
    </form>
  );
}

export function FormGerar({ avaliacoes }: { avaliacoes: { id: string; nome: string; concluida: boolean }[] }) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(gerarDoEixo2Action, undefined);
  if (avaliacoes.length === 0) {
    return <p className="text-sm text-zinc-500">Nenhuma avaliação do Eixo 2 ainda. Os planos escritos lá viram ações aqui.</p>;
  }
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Avaliação do Eixo 2
          <Select name="avaliacaoId" defaultValue={avaliacoes[0]!.id} className="w-72">
            {avaliacoes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
                {a.concluida ? "" : " (em preenchimento)"}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Gerando..." : "Gerar ações a partir do Eixo 2"}
        </Button>
      </div>
      <Mensagem estado={estado} />
    </form>
  );
}

