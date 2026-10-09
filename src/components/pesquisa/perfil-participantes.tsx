import type { PerfilParticipantes } from "@/lib/perfil-participantes";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Perfil dos participantes (pré-pesquisa) na visão do gestor: totais da
 * pesquisa inteira, separados do Eixo 1 — nunca por setor nem cruzado com
 * as respostas (decisão do cliente; o cruzamento é só da área do admin).
 */
export function PerfilParticipantesSecao({ perfil }: { perfil: PerfilParticipantes }) {
  return (
    <section className="mt-10" aria-label="Perfil dos participantes">
      <h3 className="text-sm font-semibold text-zinc-900">Perfil dos participantes (pré-pesquisa)</h3>
      <p className="text-xs text-zinc-500 mb-4">
        Totais da pesquisa inteira, sem filtro e sem ligação com as respostas do questionário. {perfil.responderam} de{" "}
        {perfil.concluidas} participante(s) responderam à pré-pesquisa.
      </p>
      {!perfil.suficiente ? (
        <p className="text-sm text-zinc-500">
          Menos de {perfil.limite} pré-pesquisas respondidas — o perfil fica oculto para proteger o anonimato.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {perfil.distribuicao.map((d) => (
            <div key={d.pergunta.chave} className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm font-medium text-zinc-900 mb-2">
                {d.pergunta.rotuloCurto}
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  {d.respondentes} resposta(s){d.semResposta ? ` · ${d.semResposta} em branco` : ""}
                </span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {d.opcoes.map((o) => (
                  <li key={o.valor} className="grid grid-cols-[1fr_5rem_3.5rem] items-center gap-2 text-xs text-zinc-700">
                    <span>{o.rotulo}</span>
                    <span className="h-2 rounded bg-zinc-100">
                      <span className="block h-2 rounded bg-[var(--ws-accent,#18181b)]" style={{ width: pct(o.percentual) }} />
                    </span>
                    <span className="text-right tabular-nums">
                      {o.quantidade} · {pct(o.percentual)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
