"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarRespostaEixo2Action } from "../actions";
import { CONDICOES, ROTULO_CONDICAO, type Condicao } from "@/lib/eixo2";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

type Resp = { condicao: Condicao; planoAcao: string | null; justificativa: string | null };
type Setor = { id: string; nome: string };
type Patch = Partial<Resp>;

const COR_SELECIONADA: Record<Condicao, string> = {
  EFICAZ: "peer-checked:bg-emerald-600 peer-checked:border-emerald-600",
  NAO_SE_APLICA: "peer-checked:bg-zinc-600 peer-checked:border-zinc-600",
  PRECISA_MELHORAR: "peer-checked:bg-amber-500 peer-checked:border-amber-500",
  INEXISTENTE: "peer-checked:bg-red-600 peer-checked:border-red-600",
};

const ORDEM_EXIBICAO: Condicao[] = ["EFICAZ", "PRECISA_MELHORAR", "INEXISTENTE", "NAO_SE_APLICA"];

function mesmaResposta(a: Resp | undefined, b: Resp | undefined) {
  if (!a || !b) return a === b;
  return a.condicao === b.condicao && a.planoAcao === b.planoAcao && a.justificativa === b.justificativa;
}

/**
 * Uma pergunta do Eixo 2. Com "mesma resposta para todos os setores"
 * ligado (padrão), há um único controle que grava em todos os setores;
 * desligado, uma linha por setor. Salva sozinho a cada mudança.
 */
export function QuestaoCard({
  avaliacaoId,
  questao,
  setores,
  iniciais,
  somenteLeitura,
}: {
  avaliacaoId: string;
  questao: { id: string; ordem: number; texto: string; planoSugerido: string | null; perguntaColaborador: string };
  setores: Setor[];
  iniciais: Record<string, Resp | undefined>;
  somenteLeitura: boolean;
}) {
  const [resps, setResps] = useState(iniciais);
  const todasIguais = setores.every((s) => mesmaResposta(resps[s.id], resps[setores[0]!.id]));
  const [modoTodos, setModoTodos] = useState(setores.length <= 1 || todasIguais);
  const [escolhendoFonte, setEscolhendoFonte] = useState(false);
  const [versao, setVersao] = useState(0); // remonta os editores após aplicar em massa
  const [status, setStatus] = useState<{ tipo: "ocioso" | "salvando" | "salvo" | "erro"; msg?: string }>({
    tipo: "ocioso",
  });

  async function salvar(setorIds: string[], patch: Patch) {
    setResps((atual) => {
      const novo = { ...atual };
      for (const id of setorIds) {
        const base = novo[id];
        if (base) novo[id] = { ...base, ...patch };
        else if (patch.condicao) novo[id] = { condicao: patch.condicao, planoAcao: null, justificativa: null, ...patch };
      }
      return novo;
    });
    setStatus({ tipo: "salvando" });
    try {
      const r = await salvarRespostaEixo2Action(avaliacaoId, { questaoId: questao.id, setorIds, ...patch });
      setStatus(r.ok ? { tipo: "salvo" } : { tipo: "erro", msg: r.erro });
    } catch {
      // Falha inesperada (rede, servidor) não pode deixar o cartão preso em
      // "Salvando…" — a pessoa precisa saber que não gravou.
      setStatus({ tipo: "erro", msg: "Não foi possível salvar. Tente de novo." });
    }
  }

  const todosIds = setores.map((s) => s.id);
  const respostaComum = resps[setores[0]?.id ?? ""];

  function alternarModo() {
    if (!modoTodos) {
      if (todasIguais) setModoTodos(true);
      else setEscolhendoFonte(true);
    } else {
      setModoTodos(false);
    }
  }

  async function aplicarATodos(fonteId: string) {
    const fonte = resps[fonteId];
    if (!fonte) return;
    await salvar(todosIds, { ...fonte });
    setVersao((v) => v + 1);
    setEscolhendoFonte(false);
    setModoTodos(true);
  }

  const respondida = setores.every((s) => resps[s.id]);

  // A barra "x de 35" vem do servidor: atualiza quando esta pergunta passa a
  // estar completa (já gravada), não a cada clique.
  const router = useRouter();
  const completaAntes = useRef(respondida);
  useEffect(() => {
    if (status.tipo !== "salvo") return;
    if (respondida && !completaAntes.current) router.refresh();
    completaAntes.current = respondida;
  }, [respondida, status.tipo, router]);

  return (
    <article
      className={`rounded-lg border p-5 ${respondida ? "border-zinc-200" : "border-zinc-300 border-dashed"}`}
      aria-labelledby={`q-${questao.id}`}
    >
      <p className="text-xs text-zinc-400 mb-1">
        Pergunta ao colaborador (Eixo 1): {questao.perguntaColaborador}
      </p>
      <h3 id={`q-${questao.id}`} className="font-medium text-zinc-900 leading-relaxed mb-4">
        <span className="text-zinc-400 font-normal">{questao.ordem}.</span> {questao.texto}
      </h3>

      {setores.length > 1 && !somenteLeitura && (
        <label className="flex items-center gap-2 text-sm text-zinc-700 mb-4 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            role="switch"
            checked={modoTodos}
            onChange={alternarModo}
            className="h-4 w-4 rounded border-zinc-300 cursor-pointer"
          />
          Mesma resposta para todos os setores
        </label>
      )}

      {escolhendoFonte && (
        <EscolherFonte
          setores={setores.filter((s) => resps[s.id])}
          onAplicar={aplicarATodos}
          onCancelar={() => setEscolhendoFonte(false)}
        />
      )}

      {modoTodos ? (
        <BlocoResposta
          key={`todos-${versao}`}
          idBase={`${questao.id}-todos`}
          resp={respostaComum}
          planoSugerido={questao.planoSugerido}
          desabilitado={somenteLeitura}
          onPatch={(patch) => salvar(todosIds, patch)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {setores.map((s) => (
            <div key={s.id} className="rounded-md bg-zinc-50 p-3">
              <p className="text-sm font-semibold text-zinc-800 mb-2">{s.nome}</p>
              <BlocoResposta
                key={`${s.id}-${versao}`}
                idBase={`${questao.id}-${s.id}`}
                resp={resps[s.id]}
                planoSugerido={questao.planoSugerido}
                desabilitado={somenteLeitura}
                onPatch={(patch) => salvar([s.id], patch)}
              />
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-3 h-4" aria-live="polite">
        {status.tipo === "salvando" && <span className="text-zinc-400">Salvando…</span>}
        {status.tipo === "salvo" && <span className="text-emerald-700">Salvo</span>}
        {status.tipo === "erro" && <span className="text-red-600">{status.msg}</span>}
      </p>
    </article>
  );
}

function EscolherFonte({
  setores,
  onAplicar,
  onCancelar,
}: {
  setores: Setor[];
  onAplicar: (setorId: string) => void;
  onCancelar: () => void;
}) {
  const [fonte, setFonte] = useState(setores[0]?.id ?? "");
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 mb-4 text-sm text-amber-900 flex flex-col gap-2">
      <p>As respostas estão diferentes entre os setores. Qual aplicar a todos?</p>
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={fonte} onChange={(e) => setFonte(e.target.value)} className="w-56" aria-label="Setor de origem">
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              Resposta de {s.nome}
            </option>
          ))}
        </Select>
        <Button type="button" onClick={() => onAplicar(fonte)} disabled={!fonte}>
          Aplicar a todos
        </Button>
        <Button type="button" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Condição + plano de ação + justificativa de um alvo (todos ou um setor). */
function BlocoResposta({
  idBase,
  resp,
  planoSugerido,
  desabilitado,
  onPatch,
}: {
  idBase: string;
  resp: Resp | undefined;
  planoSugerido: string | null;
  desabilitado: boolean;
  onPatch: (patch: Patch) => void;
}) {
  const [plano, setPlano] = useState<string | null>(resp?.planoAcao ?? null);
  const [justificativa, setJustificativa] = useState(resp?.justificativa ?? "");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const ativos = timers.current;
    return () => Object.values(ativos).forEach(clearTimeout);
  }, []);

  function adiar(campo: "planoAcao" | "justificativa", valor: string) {
    clearTimeout(timers.current[campo]);
    timers.current[campo] = setTimeout(() => onPatch({ [campo]: valor }), 700);
  }
  function salvarJa(campo: "planoAcao" | "justificativa", valor: string) {
    clearTimeout(timers.current[campo]);
    onPatch({ [campo]: valor });
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="border-0 p-0 m-0" disabled={desabilitado}>
        <legend className="sr-only">Situação da medida de controle</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ORDEM_EXIBICAO.filter((c) => CONDICOES.includes(c)).map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name={`cond-${idBase}`}
                value={c}
                checked={resp?.condicao === c}
                onChange={() => onPatch({ condicao: c })}
                className="peer sr-only"
              />
              <span
                className={`flex items-center justify-center text-center min-h-11 px-2 py-1.5 rounded-md border border-zinc-300 text-xs sm:text-sm text-zinc-700 transition-colors duration-150 hover:border-zinc-400 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed ${COR_SELECIONADA[c]}`}
              >
                {ROTULO_CONDICAO[c]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {plano === null ? (
        !desabilitado && (
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            disabled={!resp}
            title={!resp ? "Escolha a resposta primeiro" : undefined}
            onClick={() => {
              const texto = planoSugerido ?? "";
              setPlano(texto);
              onPatch({ planoAcao: texto });
            }}
          >
            + Adicionar plano de ação
          </Button>
        )
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`plano-${idBase}`} className="text-sm font-medium text-zinc-700">
            Plano de ação
          </label>
          <Textarea
            id={`plano-${idBase}`}
            value={plano}
            disabled={desabilitado}
            rows={Math.min(8, Math.max(3, plano.split("\n").length + 1))}
            onChange={(e) => {
              setPlano(e.target.value);
              adiar("planoAcao", e.target.value);
            }}
            onBlur={(e) => salvarJa("planoAcao", e.target.value)}
            placeholder="Descreva as ações previstas"
          />
          {!desabilitado && (
            <button
              type="button"
              className="self-start text-xs text-zinc-500 hover:text-red-600 cursor-pointer"
              onClick={() => {
                clearTimeout(timers.current.planoAcao);
                setPlano(null);
                onPatch({ planoAcao: null });
              }}
            >
              Remover plano de ação
            </button>
          )}
        </div>
      )}

      <details className="text-sm" open={Boolean(justificativa)}>
        <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 select-none">
          Justificativa / prática observada (opcional)
        </summary>
        <Textarea
          className="mt-2"
          value={justificativa}
          disabled={desabilitado || !resp}
          aria-label="Justificativa ou prática observada"
          onChange={(e) => {
            setJustificativa(e.target.value);
            adiar("justificativa", e.target.value);
          }}
          onBlur={(e) => salvarJa("justificativa", e.target.value)}
        />
      </details>
    </div>
  );
}
