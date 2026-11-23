"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmarRevisaoSinaisAction, salvarSinalEixo2Action } from "../actions";
import { Button } from "@/components/ui/button";
import { ESCALA_SINAIS, PERGUNTA_SINAIS, VALOR_PADRAO_SINAL } from "@/lib/sinais-eixo2-escala";

type Setor = { id: string; nome: string };
type Sinal = { id: string; ordem: number; texto: string };

/**
 * Etapa da ISO 45003 (item 8.1.2.5): o padrão é "Nunca" em todo sinal e setor.
 * Só quando o líder de um setor reconhece o sinal, o consultor marca "Sinal
 * identificado" e a escala se abre para aquele setor. Salva sozinho a cada
 * mudança; "Nunca" volta ao padrão. A revisão precisa ser confirmada ao fim.
 */
export function SinaisEtapa({
  avaliacaoId,
  sinais,
  setores,
  iniciais,
  revisadoInicial,
  somenteLeitura,
}: {
  avaliacaoId: string;
  sinais: Sinal[];
  setores: Setor[];
  /** Valores identificados por "sinalId:setorId" (o que não está aqui é "Nunca"). */
  iniciais: Record<string, number>;
  revisadoInicial: boolean;
  somenteLeitura: boolean;
}) {
  const router = useRouter();
  const [valores, setValores] = useState(iniciais);
  // Setor com a escala aberta mas ainda em "Nunca" (acabou de marcar "identificado").
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [revisado, setRevisado] = useState(revisadoInicial);
  const [status, setStatus] = useState<{ tipo: "ocioso" | "salvando" | "salvo" | "erro"; msg?: string }>({ tipo: "ocioso" });
  const [confirmando, setConfirmando] = useState(false);

  const valorDe = (sinalId: string, setorId: string) => valores[`${sinalId}:${setorId}`] ?? VALOR_PADRAO_SINAL;

  async function salvar(sinalId: string, setorId: string, valor: number) {
    const chave = `${sinalId}:${setorId}`;
    const anterior = valores[chave];
    setValores((v) => {
      const novo = { ...v };
      if (valor === VALOR_PADRAO_SINAL) delete novo[chave];
      else novo[chave] = valor;
      return novo;
    });
    setStatus({ tipo: "salvando" });
    try {
      const r = await salvarSinalEixo2Action(avaliacaoId, { sinalId, setorId, valor });
      if (r.ok) setStatus({ tipo: "salvo" });
      else {
        setStatus({ tipo: "erro", msg: r.erro });
        setValores((v) => {
          const novo = { ...v };
          if (anterior === undefined) delete novo[chave];
          else novo[chave] = anterior;
          return novo;
        });
      }
    } catch {
      // Falha de rede/servidor não pode deixar a tela dizendo que gravou.
      setStatus({ tipo: "erro", msg: "Não foi possível salvar. Tente de novo." });
      setValores((v) => {
        const novo = { ...v };
        if (anterior === undefined) delete novo[chave];
        else novo[chave] = anterior;
        return novo;
      });
    }
  }

  function alternarIdentificado(sinalId: string, setorId: string, marcado: boolean) {
    const chave = `${sinalId}:${setorId}`;
    if (marcado) {
      setAbertos((a) => new Set(a).add(chave));
    } else {
      setAbertos((a) => {
        const n = new Set(a);
        n.delete(chave);
        return n;
      });
      if (valorDe(sinalId, setorId) !== VALOR_PADRAO_SINAL) void salvar(sinalId, setorId, VALOR_PADRAO_SINAL);
    }
  }

  async function confirmar() {
    setConfirmando(true);
    try {
      const r = await confirmarRevisaoSinaisAction(avaliacaoId);
      if (r.ok) {
        setRevisado(true);
        router.refresh();
      } else setStatus({ tipo: "erro", msg: r.erro });
    } catch {
      setStatus({ tipo: "erro", msg: "Não foi possível confirmar. Tente de novo." });
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <section aria-label="Sinais de exposição a riscos psicossociais">
      <h2 className="text-lg font-bold text-zinc-900">Sinais de exposição (ISO 45003)</h2>
      <p className="text-sm text-zinc-500 mb-2">Item 8.1.2.5 da ISO 45003 · identificados pelo líder de cada setor</p>
      <p className="font-medium text-zinc-900 leading-relaxed mb-1">{PERGUNTA_SINAIS}</p>
      <p className="text-sm text-zinc-500 mb-5 max-w-3xl">
        O padrão é <strong>Nunca</strong> em todos os setores — não precisa marcar nada. Só quando o líder de um setor
        reconhece o sinal, marque <em>Sinal identificado</em> naquele setor e escolha com que frequência ocorre. Estas
        respostas ficam disponíveis no resultado do Eixo 2 e não entram no cálculo do índice.
      </p>

      <ul className="mb-5 grid gap-x-6 gap-y-1 text-xs text-zinc-500 sm:grid-cols-2" aria-label="Legenda da escala">
        {ESCALA_SINAIS.map((e) => (
          <li key={e.valor}>
            <strong className="text-zinc-700">
              {e.valor} — {e.rotulo}:
            </strong>{" "}
            {e.ajuda}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4">
        {sinais.map((sinal) => (
          <article key={sinal.id} className="rounded-lg border border-zinc-200 p-5" aria-labelledby={`sinal-${sinal.id}`}>
            <h3 id={`sinal-${sinal.id}`} className="font-medium text-zinc-900 leading-relaxed mb-3">
              <span className="text-zinc-400 font-normal">{sinal.ordem}.</span> {sinal.texto}
            </h3>
            <ul className="flex flex-col divide-y divide-zinc-100">
              {setores.map((setor) => {
                const chave = `${sinal.id}:${setor.id}`;
                const valor = valorDe(sinal.id, setor.id);
                const aberto = valor !== VALOR_PADRAO_SINAL || abertos.has(chave);
                return (
                  <li key={setor.id} className="py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm text-zinc-800">{setor.nome}</span>
                      {somenteLeitura ? (
                        <span className="text-sm text-zinc-600">
                          {ESCALA_SINAIS.find((e) => e.valor === valor)?.rotulo}
                        </span>
                      ) : (
                        <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={aberto}
                            onChange={(e) => alternarIdentificado(sinal.id, setor.id, e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300 cursor-pointer"
                            aria-label={`Sinal identificado — ${sinal.texto} — ${setor.nome}`}
                          />
                          Sinal identificado
                        </label>
                      )}
                    </div>
                    {aberto && !somenteLeitura && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label={`Frequência — ${setor.nome}`}>
                        {ESCALA_SINAIS.map((e) => (
                          <label key={e.valor} className="cursor-pointer" title={e.ajuda}>
                            <input
                              type="radio"
                              name={`sinal-${sinal.id}-${setor.id}`}
                              value={e.valor}
                              checked={valor === e.valor}
                              onChange={() => {
                                if (e.valor === VALOR_PADRAO_SINAL) alternarIdentificado(sinal.id, setor.id, false);
                                else void salvar(sinal.id, setor.id, e.valor);
                              }}
                              className="peer sr-only"
                            />
                            <span className="flex items-center justify-center text-center h-10 px-2 rounded-md border border-zinc-300 text-sm text-zinc-700 transition-colors hover:border-zinc-400 peer-checked:bg-[var(--ws-accent,#18181b)] peer-checked:text-[var(--ws-on-accent,#ffffff)] peer-checked:border-[var(--ws-accent,#18181b)] peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-900 peer-focus-visible:ring-offset-2">
                              {e.rotulo}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>

      <p className="mt-3 h-5 text-xs" role="status" aria-live="polite">
        {status.tipo === "salvando" && <span className="text-zinc-400">Salvando…</span>}
        {status.tipo === "salvo" && <span className="text-emerald-700">Salvo</span>}
        {status.tipo === "erro" && <span className="text-red-600">{status.msg}</span>}
      </p>

      <div
        className={`mt-4 rounded-lg border px-5 py-4 ${revisado ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
      >
        {revisado ? (
          <p className="text-sm text-emerald-900" data-testid="sinais-revisados">
            ✓ Revisão dos sinais confirmada.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-900 max-w-xl">
              Quando terminar, confirme a revisão. Isso vale também quando <strong>nenhum sinal</strong> foi identificado
              em nenhum setor — sem a confirmação, o &ldquo;Nunca&rdquo; é só o valor padrão e a avaliação não conclui.
            </p>
            {!somenteLeitura && (
              <Button type="button" onClick={confirmar} disabled={confirmando}>
                {confirmando ? "Confirmando..." : "Confirmo a revisão dos sinais"}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
