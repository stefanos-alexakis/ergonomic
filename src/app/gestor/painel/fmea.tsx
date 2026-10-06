import Link from "next/link";
import type { AcaoVinculada, ItemFmea } from "@/lib/painel-frprt";
import { FASES, formatarDia, type Fase } from "@/lib/plano-acao-util";
import {
  FAIXAS_D,
  FAIXAS_O,
  MATRIZ_S_O,
  PRIORIDADES,
  textoRegraPrazo,
  type RegrasPrazo,
  ROTULO_AGRAVANTE,
  type Prazos,
  type Prioridade,
} from "@/lib/fmea";
import { CONCLUSOES, formatarRisco } from "@/lib/score-final";

/**
 * Seção FMEA do Painel FRPRT: mapa S × O, as duas listas priorizadas
 * (acima de 4,00 → PGR; 3,01 a 4,00 → acompanhamento) e os critérios
 * documentados (NR-1, item 1.5.4.4.2).
 */

const data = (d: Date) => d.toLocaleDateString("pt-BR");

export function PilulaPrioridade({ prioridade }: { prioridade: Prioridade }) {
  const p = PRIORIDADES[prioridade];
  return (
    <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap" style={{ background: p.fundo, color: p.cor }}>
      {p.rotulo}
    </span>
  );
}

/** Quando há ação no Plano de ação, valem os prazos dela; senão, a sugestão da FMEA. */
export function PrazosOuAcoes({ prazos, acoes }: { prazos: Prazos; acoes: AcaoVinculada[] }) {
  if (acoes.length === 0) {
    return (
      <span className="flex flex-col gap-0.5">
        <TextoPrazos prazos={prazos} />
        <span className="text-[11px] text-zinc-400">sugerido pela FMEA · sem ação no plano</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-1 text-xs">
      {acoes.map((a) => (
        <Link key={a.id} href={`/gestor/plano/${a.id}`} className="text-zinc-700 hover:underline">
          <strong>Ação #{a.numero}</strong> · {FASES[a.fase as Fase]?.rotulo ?? a.fase}
          <br />
          {a.fase === "VERIFICAR" || a.fase === "CONCLUIDA" ? (
            <>Reavaliar em <strong className="tabular-nums">{formatarDia(a.reavaliarEm)}</strong></>
          ) : (
            <>Prazo <strong className="tabular-nums">{formatarDia(a.prazo)}</strong></>
          )}
        </Link>
      ))}
    </span>
  );
}

export function TextoPrazos({ prazos }: { prazos: Prazos }) {
  return (
    <span className="text-xs text-zinc-600 leading-snug">
      {prazos.plano ? (
        <>
          Plano até <strong className="tabular-nums">{data(prazos.plano)}</strong>
          <br />
          Medidas até <strong className="tabular-nums">{data(prazos.implantacao!)}</strong>
          <br />
        </>
      ) : (
        <>
          Manter os controles
          <br />
        </>
      )}
      Reavaliar em <strong className="tabular-nums">{data(prazos.reavaliacao)}</strong>
    </span>
  );
}

function Nota({ valor }: { valor: number }) {
  const cores = ["#4d7c0f", "#a16207", "#c2410c", "#b91c1c", "#7f1d1d"];
  return (
    <span
      className="inline-grid place-items-center h-7 w-7 rounded-md text-sm font-semibold text-white tabular-nums"
      style={{ background: cores[valor - 1] }}
    >
      {valor}
    </span>
  );
}

/** Mapa de calor S × O com a quantidade de setor × fator em cada célula. */
export function MapaSO({ contagem }: { contagem: number[][] }) {
  return (
    <div className="inline-grid grid-cols-[3rem_repeat(5,minmax(3rem,1fr))] gap-1 text-xs" role="table" aria-label="Matriz severidade × ocorrência">
      <span />
      {[1, 2, 3, 4, 5].map((o) => (
        <span key={o} className="text-center text-zinc-500 font-medium" role="columnheader">
          O {o}
        </span>
      ))}
      {[5, 4, 3, 2, 1].map((s) => (
        <div key={s} className="contents" role="row">
          <span className="text-zinc-500 font-medium self-center" role="rowheader">
            S {s}
          </span>
          {[1, 2, 3, 4, 5].map((o) => {
            const p = PRIORIDADES[MATRIZ_S_O[s - 1]![o - 1]!];
            const n = contagem[s - 1]![o - 1]!;
            return (
              <span
                key={o}
                role="cell"
                className="h-11 rounded-md grid place-items-center font-bold tabular-nums"
                style={{ background: p.fundo, color: p.cor, opacity: n ? 1 : 0.45 }}
                title={`Severidade ${s} × Ocorrência ${o}: nível base ${p.rotulo}`}
              >
                {n || ""}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function TabelaFmea({ itens, vazio }: { itens: ItemFmea[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-sm text-zinc-500">{vazio}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Prioridade</th>
            <th className="px-3 py-2 text-left font-medium">Setor · fator</th>
            <th className="px-3 py-2 text-center font-medium">Índice</th>
            <th className="px-3 py-2 text-center font-medium" title="Severidade">S</th>
            <th className="px-3 py-2 text-center font-medium" title="Ocorrência (Eixo 1)">O</th>
            <th className="px-3 py-2 text-center font-medium" title="Detecção / controle (Eixo 2)">D</th>
            <th className="px-3 py-2 text-center font-medium">RPN</th>
            <th className="px-3 py-2 text-left font-medium">Prazos / plano de ação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => {
            const c = CONCLUSOES[i.celula.conclusao!];
            return (
              <tr key={`${i.setorId}-${i.fator.id}`} className="border-t border-zinc-100 align-top">
                <td className="px-3 py-3">
                  <PilulaPrioridade prioridade={i.fmea.prioridade} />
                </td>
                <td className="px-3 py-3">
                  <p className="font-medium text-zinc-900">
                    {i.setor} · {i.fator.nome}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    S-base {i.fmea.sBase}
                    {i.fmea.agravantes.map((a) => ` · +1 ${ROTULO_AGRAVANTE[a]}`).join("")}
                  </p>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-block rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums" style={{ background: c.fundo, color: c.cor }}>
                    {formatarRisco(i.celula.final!)}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <Nota valor={i.fmea.s} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Nota valor={i.fmea.o} />
                </td>
                <td className="px-3 py-3 text-center">
                  <Nota valor={i.fmea.d} />
                </td>
                <td className="px-3 py-3 text-center tabular-nums font-semibold text-zinc-800">{i.fmea.rpn}</td>
                <td className="px-3 py-3 min-w-44">
                  <PrazosOuAcoes prazos={i.prazos} acoes={i.acoes} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Critérios documentados (NR-1 1.5.4.4.2): tabela de severidade, faixas, matriz e prazos. */
export function CriteriosFmea({
  severidades,
  regrasPrazo,
}: {
  severidades: { fator: { id: string; nome: string }; severidade: number | null; justificativa: string | null }[];
  regrasPrazo: RegrasPrazo;
}) {
  return (
    <details className="rounded-lg border border-zinc-200 mt-6">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-zinc-800">
        Critérios da classificação FMEA (severidade, ocorrência, detecção e prazos)
      </summary>
      <div className="px-4 pb-5 flex flex-col gap-5 text-sm">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Severidade-base por fator</h4>
          <table className="w-full text-sm">
            <tbody>
              {severidades.map((s) => (
                <tr key={s.fator.id} className="border-t border-zinc-100 align-top">
                  <td className="py-2 pr-3 text-zinc-900 whitespace-nowrap">{s.fator.nome}</td>
                  <td className="py-2 pr-3 text-center">{s.severidade !== null ? <Nota valor={s.severidade} /> : "—"}</td>
                  <td className="py-2 text-zinc-600">{s.justificativa ?? "Sem severidade cadastrada (usa 3)."}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-zinc-500 mt-2">
            Agravantes no setor (+1 cada, até 5): {ROTULO_AGRAVANTE.ATESTADO}; {ROTULO_AGRAVANTE.AFASTAMENTO_LONGO} (só
            atestado relacionado); {ROTULO_AGRAVANTE.EXPOSTOS} (média individual 4 ou mais no fator).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">O · Ocorrência (Eixo 1)</h4>
            <ul className="flex flex-col gap-1">
              {FAIXAS_O.map((f, i) => (
                <li key={f} className="flex items-center gap-2">
                  <Nota valor={i + 1} /> média {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">D · Detecção e controle (Eixo 2)</h4>
            <ul className="flex flex-col gap-1">
              {FAIXAS_D.map((f, i) => (
                <li key={f} className="flex items-center gap-2">
                  <Nota valor={i + 1} /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Prioridade e prazos</h4>
          <p className="text-zinc-600 mb-2">
            A matriz S × O dá o nível base. Detecção 4 ou 5 sobe um nível; detecção 1 desce um (severidade 5 nunca fica
            abaixo de Média). RPN = S × O × D desempata. Prazos contados da emissão do relatório:
          </p>
          <ul className="flex flex-col gap-1">
            {(Object.keys(regrasPrazo) as Prioridade[]).map((p) => (
              <li key={p} className="flex items-center gap-2">
                <PilulaPrioridade prioridade={p} /> {textoRegraPrazo(regrasPrazo[p])}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
