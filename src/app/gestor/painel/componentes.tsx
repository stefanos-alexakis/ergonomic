import type { ReactNode } from "react";
import type { Achado, LinhaSetorPainel, ResultadoGeral } from "@/lib/painel-frprt";
import { CONCLUSOES, formatarEfeito, formatarRisco, posicaoNaRegua, type Conclusao } from "@/lib/score-final";
import { IconeCalendario, IconeEmpresa, IconeFator } from "@/components/frprt/icones";

/** "jan–dez/2026" (mesmo ano) ou "nov/2025–mar/2026". */
export function periodoCurto(inicio: Date, fim: Date): string {
  const mes = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "");
  const ano = (d: Date) => d.getUTCFullYear();
  return ano(inicio) === ano(fim) ? `${mes(inicio)}–${mes(fim)}/${ano(fim)}` : `${mes(inicio)}/${ano(inicio)}–${mes(fim)}/${ano(fim)}`;
}

export function CabecalhoPainel({
  empresa,
  logoUrl,
  periodo,
  acoes,
}: {
  empresa: string;
  logoUrl: string | null;
  periodo: string | null;
  acoes?: ReactNode;
}) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-6 border-b border-zinc-200">
      <div className="flex items-center gap-4">
        <span className="text-4xl font-black tracking-tight text-[#183b56]">FRPRT</span>
        <span className="hidden sm:block h-12 w-px bg-zinc-300" aria-hidden="true" />
        <div>
          <h1 className="text-xl font-bold text-[#183b56] leading-tight">Painel de indicadores</h1>
          <p className="text-sm text-zinc-500">Fatores de Risco Psicossociais Relacionados ao Trabalho</p>
        </div>
      </div>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5">
          {logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <IconeEmpresa className="h-7 w-7 text-[#183b56]" />
          )}
          <div>
            <p className="text-xs text-zinc-500">Empresa</p>
            <p className="text-sm font-semibold text-zinc-900">{empresa}</p>
          </div>
        </div>
        {periodo && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5">
            <IconeCalendario className="h-7 w-7 text-[#183b56]" />
            <div>
              <p className="text-xs text-zinc-500">Período da análise</p>
              <p className="text-sm font-semibold text-zinc-900 capitalize">{periodo}</p>
            </div>
          </div>
        )}
        {acoes}
      </div>
    </header>
  );
}

/** Régua 1–5 com as três faixas da metodologia e o marcador no índice. */
export function Regua({ risco }: { risco: number }) {
  return (
    <div className="w-full">
      {/* Tons médios (não os fundos claros): a régua fica sobre o cartão
          já colorido e precisa contrastar com ele em qualquer das 3 cores. */}
      <div className="relative h-3 rounded-full overflow-hidden flex ring-2 ring-white" aria-hidden="true">
        <div className="h-full" style={{ width: "50%", background: "#6ee7b7" }} />
        <div className="h-full" style={{ width: "25%", background: "#fcd34d" }} />
        <div className="h-full" style={{ width: "25%", background: "#f87171" }} />
      </div>
      <div className="relative h-0">
        <div
          className="absolute -top-[18px] h-6 w-1.5 -translate-x-1/2 rounded-full bg-zinc-900 ring-2 ring-white"
          style={{ left: `${posicaoNaRegua(risco)}%` }}
        />
      </div>
      <div className="relative h-4 mt-2 text-[11px] text-zinc-500 tabular-nums" aria-hidden="true">
        {[
          { v: 1, p: 0, t: "0" },
          { v: 3, p: 50, t: "-50%" },
          { v: 4, p: 75, t: "-50%" },
          { v: 5, p: 100, t: "-100%" },
        ].map((m) => (
          <span key={m.v} className="absolute" style={{ left: `${m.p}%`, transform: `translateX(${m.t})` }}>
            {m.v}
          </span>
        ))}
      </div>
      <div className="flex text-[11px] mt-1">
        <span className="w-1/2 font-medium" style={{ color: CONCLUSOES.SEM_RISCO.cor }}>
          Baixo risco
        </span>
        <span className="w-1/4 font-medium" style={{ color: CONCLUSOES.CONTROLE.cor }}>
          Médio risco
        </span>
        <span className="w-1/4 font-medium text-right" style={{ color: CONCLUSOES.RISCO_EXISTENTE.cor }}>
          Alto risco → plano de ação
        </span>
      </div>
    </div>
  );
}

function Numero({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2">
      <div className="text-xl font-bold text-zinc-900 tabular-nums">{valor}</div>
      <div className="text-xs text-zinc-600 leading-tight">{rotulo}</div>
    </div>
  );
}

/** Resultado geral em destaque: índice, cor, descrição e régua. */
export function CartaoGeral({ geral }: { geral: ResultadoGeral }) {
  const c = CONCLUSOES[geral.conclusao];
  return (
    <section
      aria-labelledby="resultado-geral"
      className="rounded-xl border-2 p-6 flex flex-col gap-5"
      style={{ borderColor: c.cor, background: c.fundo }}
    >
      <div>
        <h2 id="resultado-geral" className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Resultado geral da empresa
        </h2>
        <div className="flex items-end gap-4 mt-2">
          <span className="text-6xl font-black leading-none tabular-nums" style={{ color: c.cor }}>
            {formatarRisco(geral.final)}
          </span>
          <div className="pb-1">
            <p className="text-lg font-bold leading-tight" style={{ color: c.cor }}>
              {c.rotulo}
            </p>
            <p className="text-sm text-zinc-700">{c.curto} · índice de 1 a 5</p>
          </div>
        </div>
        <p className="text-sm text-zinc-800 mt-3">{c.descricao}</p>
      </div>
      <Regua risco={geral.final} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Numero valor={geral.setoresAvaliados} rotulo="setores avaliados" />
        <Numero valor={geral.setoresEmRisco} rotulo="setores em risco alto" />
        <Numero valor={geral.fatoresPgr} rotulo="situações no PGR" />
        <Numero
          valor={geral.participacao !== null ? `${Math.round(geral.participacao * 100)}%` : "—"}
          rotulo="participação"
        />
      </div>
    </section>
  );
}

/** Um cartão por setor, do mais crítico para o menos. */
export function CartoesSetores({ linhas, limite }: { linhas: LinhaSetorPainel[]; limite: number }) {
  const ordenadas = [...linhas].sort((a, b) => (b.final ?? -1) - (a.final ?? -1));
  return (
    <section aria-labelledby="setores-resumo" className="flex flex-col gap-3">
      <h2 id="setores-resumo" className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        Pontuação dos setores
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ordenadas.map((l) => {
          const c = l.conclusao ? CONCLUSOES[l.conclusao] : null;
          return (
            <div
              key={l.setorId}
              className="rounded-lg border p-4 flex items-center justify-between gap-3"
              style={c ? { borderColor: c.cor, background: c.fundo } : { borderColor: "#e4e4e7" }}
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{l.nome}</p>
                {c ? (
                  <p className="text-xs font-medium" style={{ color: c.cor }}>
                    {c.curto}
                    {l.situacoesPgr > 0 ? ` · ${l.situacoesPgr} no PGR` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    {l.suprimido ? `Amostra insuficiente (n=${l.respondentes}, mín. ${limite})` : "Sem dados"}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-black tabular-nums leading-none" style={{ color: c?.cor ?? "#a1a1aa" }}>
                  {l.final !== null ? formatarRisco(l.final) : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Barra({ valor, maximo, cor, texto }: { valor: number; maximo: number; cor: string; texto: string }) {
  const largura = Math.min(100, Math.max(0, (Math.abs(valor) / maximo) * 100));
  return (
    <div className="flex items-center gap-2 min-w-36">
      <div className="h-3 flex-1 rounded-sm bg-zinc-100 overflow-hidden">
        <div className="h-full rounded-sm" style={{ width: `${largura}%`, background: cor }} />
      </div>
      <span className="w-12 text-right tabular-nums text-sm text-zinc-800">{texto}</span>
    </div>
  );
}

function PilulaRisco({ valor, conclusao }: { valor: number; conclusao: Conclusao }) {
  const c = CONCLUSOES[conclusao];
  return (
    <span
      className="inline-flex min-w-16 justify-center rounded-md px-2.5 py-1 text-lg font-black tabular-nums"
      style={{ background: c.fundo, color: c.cor }}
      title={c.rotulo}
    >
      {formatarRisco(valor)}
    </span>
  );
}

/** Tabela da imagem de referência: barras por eixo e índice final colorido. */
export function TabelaSetores({ linhas, limite }: { linhas: LinhaSetorPainel[]; limite: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs">
            <th className="bg-[#3f4f5c] text-white px-3 py-3 text-left font-semibold">Setor</th>
            <th className="bg-[#3f4f5c] text-white px-3 py-3 text-right font-semibold">Nº de colaboradores</th>
            <th className="bg-[#3f4f5c] text-white px-3 py-3 text-right font-semibold">% de participação</th>
            <th className="bg-[#cfe2f3] text-[#183b56] px-3 py-3 font-semibold">
              Score Eixo 01<span className="block font-normal">Percepção dos colaboradores</span>
            </th>
            <th className="bg-[#cdeadf] text-[#14532d] px-3 py-3 font-semibold">
              Score Eixo 02<span className="block font-normal">Ponderante · medidas de controle</span>
            </th>
            <th className="bg-[#fde3c8] text-[#7c2d12] px-3 py-3 font-semibold">
              Score Eixo 03<span className="block font-normal">Agravante · atestados CID-F</span>
            </th>
            <th className="bg-[#183b56] text-white px-3 py-3 text-center font-semibold">Score final FRPRT</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.setorId} className="border-t border-zinc-100">
              <td className="px-3 py-3 font-semibold text-zinc-900">{l.nome}</td>
              <td className="px-3 py-3 text-right tabular-nums">{l.colaboradores ?? "—"}</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {l.participacao !== null ? `${Math.round(l.participacao * 100)}%` : `${l.respondentes} resp.`}
              </td>
              {l.suprimido || l.final === null ? (
                <td colSpan={4} className="px-3 py-3 text-center text-zinc-400">
                  {l.suprimido
                    ? `Amostra insuficiente no Eixo 1 (n=${l.respondentes}, mín. ${limite}) — protege o anonimato`
                    : "Sem dados do Eixo 1"}
                </td>
              ) : (
                <>
                  <td className="px-3 py-3">
                    <Barra valor={l.eixo1 ?? 0} maximo={5} cor="#4a86b5" texto={formatarRisco(l.eixo1 ?? 0)} />
                  </td>
                  <td className="px-3 py-3">
                    <Barra valor={l.efeitoEixo2 ?? 0} maximo={1} cor="#5fae8f" texto={formatarEfeito(l.efeitoEixo2 ?? 0)} />
                  </td>
                  <td className="px-3 py-3">
                    <Barra valor={l.efeitoEixo3 ?? 0} maximo={0.6} cor="#f39a5b" texto={formatarEfeito(l.efeitoEixo3 ?? 0)} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <PilulaRisco valor={l.final} conclusao={l.conclusao!} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const COR_ACHADO: Record<Achado["tom"], string> = {
  perigo: "#B91C1C",
  atencao: "#B45309",
  sucesso: "#047857",
  neutro: "#71717a",
};

export function ListaAchados({ achados }: { achados: Achado[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {achados.map((a) => (
        <li key={a.texto} className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COR_ACHADO[a.tom] }} />
          <span className="text-sm text-zinc-800">{a.texto}</span>
        </li>
      ))}
    </ul>
  );
}

export function FatoresEmBarras({
  principais,
}: {
  principais: { fator: { id: string; nome: string }; percentual: number; mediaFinal: number }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {principais.map((p) => {
        const cor = p.mediaFinal > 4 ? "#dc4a4f" : p.mediaFinal > 3.5 ? "#f39a5b" : p.mediaFinal > 3 ? "#f6c76b" : "#7fbf9f";
        return (
          <div key={p.fator.id} className="flex items-center gap-3">
            <IconeFator nome={p.fator.nome} className="h-6 w-6 shrink-0 text-[#183b56]" />
            <span className="w-52 shrink-0 text-sm text-zinc-800">{p.fator.nome.replace(/^\d+\.\s*/, "")}</span>
            <div className="h-4 flex-1 rounded-sm bg-zinc-100 overflow-hidden">
              <div className="h-full rounded-sm" style={{ width: `${Math.round(p.percentual * 100)}%`, background: cor }} />
            </div>
            <span className="w-12 text-right text-sm font-bold tabular-nums">{Math.round(p.percentual * 100)}%</span>
          </div>
        );
      })}
      <p className="text-xs text-zinc-500">% dos setores em que o fator ficou acima de 3,00. Cor = gravidade média.</p>
    </div>
  );
}

export function Tratativas({
  principais,
}: {
  principais: { fator: { id: string; nome: string }; tratativas: string[] }[];
}) {
  const itens = principais.filter((p) => p.tratativas[0]).map((p) => ({ fator: p.fator, texto: p.tratativas[0]! }));
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((i) => (
        <li key={i.fator.id} className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 text-[#183b56]">
            <IconeFator nome={i.fator.nome} className="h-5 w-5" />
          </span>
          <span className="text-sm text-zinc-800">
            {i.texto}
            <span className="block text-xs text-zinc-500">{i.fator.nome}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TituloSecao({ numero, titulo, sub }: { numero: number; titulo: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#183b56] text-white font-bold">
        {numero}
      </span>
      <div>
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#183b56] leading-tight">{titulo}</h2>
        {sub && <p className="text-sm text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}
