import Link from "next/link";
import { db } from "@/lib/db";
import { calcularPainelFrprt } from "@/lib/painel-frprt";
import { CONCLUSOES, formatarRisco, notaDoRisco, type Conclusao } from "@/lib/score-final";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { contextoGestor } from "../eixo2/contexto";
import {
  CabecalhoPainel,
  CartaoGeral,
  CartoesSetores,
  FatoresEmBarras,
  ListaAchados,
  TabelaSetores,
  TituloSecao,
  Tratativas,
  periodoCurto,
} from "./componentes";

export const dynamic = "force-dynamic";

const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

function Risco({ valor, conclusao, grande }: { valor: number | null; conclusao: Conclusao | null; grande?: boolean }) {
  if (valor === null || conclusao === null) return <span className="text-zinc-300">—</span>;
  const c = CONCLUSOES[conclusao];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 font-semibold tabular-nums ${grande ? "text-base" : "text-xs"}`}
      style={{ background: c.fundo, color: c.cor }}
      title={c.rotulo}
    >
      {formatarRisco(valor)}
    </span>
  );
}

export default async function PainelFrprtPage({
  searchParams,
}: {
  searchParams: Promise<{ pesquisa?: string; avaliacao?: string; levantamento?: string; setor?: string; departamento?: string }>;
}) {
  const sp = await searchParams;
  const { actor, workspace } = await contextoGestor();
  const [painel, departamentos, setoresCadastro] = await Promise.all([
    calcularPainelFrprt(
      workspace.id,
      { pesquisaId: sp.pesquisa, avaliacaoId: sp.avaliacao, levantamentoId: sp.levantamento },
      { setorId: sp.setor || undefined, departamentoId: sp.departamento || undefined },
    ),
    db.departamento.findMany({ where: { workspaceId: workspace.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    db.setorOrg.findMany({ where: { workspaceId: workspace.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  if (!painel) {
    return (
      <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
        <PageHeader eyebrow="Painel de indicadores" title="Painel FRPRT" />
        <p className="text-sm text-zinc-500">Nenhum questionário ativo na plataforma.</p>
      </ShellGestor>
    );
  }

  const { opcoes, fatores, limite, linhas, principais, pgr, avaliacaoIncompleta, geral, achados } = painel;
  const query = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const avisos: string[] = [];
  if (!opcoes.pesquisa) avisos.push("Nenhuma pesquisa do questionário atual — sem Eixo 1 não há score.");
  if (!opcoes.avaliacao) avisos.push("Sem avaliação do Eixo 2: as medidas de controle entram como ×1,00 (sem atenuação).");
  else if (avaliacaoIncompleta) avisos.push("A avaliação do Eixo 2 escolhida ainda está incompleta — valores parciais.");
  if (!opcoes.levantamento) avisos.push("Sem levantamento do Eixo 3 publicado: ocorrências entram como ×1,00 (sem agravamento).");
  if (sp.departamento) avisos.push("Filtro de departamento aplicado ao Eixo 1; os Eixos 2 e 3 são por setor.");

  const periodo = opcoes.pesquisa ? periodoCurto(opcoes.pesquisa.dataInicio, opcoes.pesquisa.dataFim) : null;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <CabecalhoPainel
        empresa={workspace.nome}
        logoUrl={workspace.logoUrl}
        periodo={periodo}
        acoes={
          <a href={`/gestor/painel/relatorio${query ? `?${query}` : ""}`} className="self-center">
            <Button>Baixar relatório (PDF)</Button>
          </a>
        }
      />

      <details className="mb-6 rounded-lg border border-zinc-200" open={Boolean(query)}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm text-zinc-700 flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-semibold">Fontes e filtros</span>
          <span className="text-zinc-500">Eixo 1: {opcoes.pesquisa?.nome ?? "—"}</span>
          <span className="text-zinc-500">Eixo 2: {opcoes.avaliacao?.nome ?? "não considerado"}</span>
          <span className="text-zinc-500">Eixo 3: {opcoes.levantamento?.nome ?? "não considerado"}</span>
        </summary>
        <form method="get" className="px-4 pb-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Eixo 1 · Pesquisa (colaboradores)
              <Select name="pesquisa" defaultValue={opcoes.pesquisa?.id ?? "nenhum"}>
                {opcoes.pesquisas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({data(p.dataInicio)} – {data(p.dataFim)})
                  </option>
                ))}
                {opcoes.pesquisas.length === 0 && <option value="nenhum">Nenhuma pesquisa</option>}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Eixo 2 · Avaliação (medidas de controle)
              <Select name="avaliacao" defaultValue={opcoes.avaliacao?.id ?? "nenhum"}>
                {opcoes.avaliacoes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                    {a.status === "RASCUNHO" ? " (em preenchimento)" : ""}
                  </option>
                ))}
                <option value="nenhum">Não considerar o Eixo 2</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Eixo 3 · Levantamento (atestados CID-F)
              <Select name="levantamento" defaultValue={opcoes.levantamento?.id ?? "nenhum"}>
                {opcoes.levantamentos.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome} ({data(l.periodoInicio)} – {data(l.periodoFim)})
                  </option>
                ))}
                <option value="nenhum">Não considerar o Eixo 3</option>
              </Select>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Setor
              <Select name="setor" defaultValue={sp.setor ?? ""} className="w-52">
                <option value="">Todos</option>
                {setoresCadastro.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Departamento
              <Select name="departamento" defaultValue={sp.departamento ?? ""} className="w-52">
                <option value="">Todos</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit">Atualizar painel</Button>
            {query && (
              <Link href="/gestor/painel" className="text-sm text-zinc-500 hover:text-zinc-900">
                Limpar
              </Link>
            )}
          </div>
        </form>
      </details>

      {avisos.length > 0 && (
        <ul className="mb-6 flex flex-col gap-1.5">
          {avisos.map((a) => (
            <li key={a} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {a}
            </li>
          ))}
        </ul>
      )}

      {/* Topo: nota geral em destaque + nota de cada setor */}
      {geral ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <CartaoGeral geral={geral} />
          <CartoesSetores linhas={linhas} limite={limite} />
        </div>
      ) : (
        <p className="mb-12 rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-6 text-sm text-zinc-600">
          Ainda não há setores com score: é preciso uma pesquisa do Eixo 1 com pelo menos {limite} respostas concluídas
          por setor.
        </p>
      )}

      {/* 1 — pontuação por setor (como a imagem de referência) */}
      <section className="mb-12" aria-label="Painel resumido por setor">
        <TituloSecao
          numero={1}
          titulo="Painel resumido por setor"
          sub="Risco final = Eixo 1 × Eixo 2 × Eixo 3 (escala 1–5, quanto maior, pior). Eixos 2 e 3 em pontos: quanto moveram o Eixo 1."
        />
        <TabelaSetores linhas={linhas} limite={limite} />
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {(["SEM_RISCO", "CONTROLE", "RISCO_EXISTENTE"] as Conclusao[]).map((k) => (
            <span
              key={k}
              className="rounded-md px-2 py-1 font-medium"
              style={{ background: CONCLUSOES[k].fundo, color: CONCLUSOES[k].cor }}
            >
              {k === "SEM_RISCO" ? "Até 3,00" : k === "CONTROLE" ? "3,01 a 4,00" : "Acima de 4,00"} · {CONCLUSOES[k].rotulo}
            </span>
          ))}
        </div>
      </section>

      {/* 2 — principais achados */}
      <section className="mb-12" aria-label="Principais achados">
        <TituloSecao numero={2} titulo="Principais achados" sub="O que mais pesa no resultado e por onde começar" />
        <ListaAchados achados={achados} />
        {principais.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="rounded-xl border border-zinc-200 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#183b56] mb-4">Fatores mais apontados</h3>
              <FatoresEmBarras principais={principais} />
            </div>
            <div className="rounded-xl border border-zinc-200 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#183b56] mb-4">
                Possibilidades de tratativas (macro)
              </h3>
              <Tratativas principais={principais} />
            </div>
          </div>
        )}
      </section>

      {/* 3 — matriz de decisão */}
      <section className="mb-10" aria-label="Matriz de decisão">
        <TituloSecao numero={3} titulo="Matriz de decisão" sub="Cada fator de cada setor: os três eixos, o resultado e o encaminhamento" />
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Setor</th>
                <th className="px-3 py-2 text-left font-medium">Fator</th>
                <th className="px-3 py-2 text-right font-medium">Eixo 1</th>
                <th className="px-3 py-2 text-right font-medium">Eixo 2</th>
                <th className="px-3 py-2 text-right font-medium">Ajustado</th>
                <th className="px-3 py-2 text-left font-medium">Eixo 3</th>
                <th className="px-3 py-2 text-center font-medium">Resultado final</th>
                <th className="px-3 py-2 text-left font-medium">Conclusão</th>
                <th className="px-3 py-2 text-left font-medium">Encaminhamento</th>
              </tr>
            </thead>
            <tbody>
              {linhas
                .filter((l) => !l.suprimido)
                .flatMap((l) =>
                  [...l.celulas]
                    .filter((c) => c.final !== null)
                    .sort((a, b) => (b.final ?? 0) - (a.final ?? 0))
                    .map((c) => {
                      const fator = fatores.find((f) => f.id === c.fatorId)!;
                      return (
                        <tr key={`${l.setorId}-${c.fatorId}`} className="border-t border-zinc-100">
                          <td className="px-3 py-2 text-zinc-700">{l.nome}</td>
                          <td className="px-3 py-2 text-zinc-900">{fator.nome}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{formatarRisco(c.eixo1!)}</td>
                          <td className="px-3 py-2 text-right tabular-nums" title={c.semEixo2 ? "Setor sem avaliação do Eixo 2" : undefined}>
                            {c.fatorEixo2.toFixed(2).replace(".", ",")}
                            {c.semEixo2 && <span className="text-zinc-400">*</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatarRisco(c.ajustado!)}</td>
                          <td className="px-3 py-2 text-zinc-600" title={c.cidsEixo3.length ? `CID: ${c.cidsEixo3.join(", ")}` : undefined}>
                            {c.rotuloEixo3}
                            {c.cidsEixo3.length > 0 && <span className="text-xs text-zinc-400"> ({c.cidsEixo3.join(", ")})</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Risco valor={c.final} conclusao={c.conclusao} />
                          </td>
                          <td className="px-3 py-2">
                            <Badge tom={CONCLUSOES[c.conclusao!].tom}>{CONCLUSOES[c.conclusao!].rotulo}</Badge>
                          </td>
                          <td className="px-3 py-2 text-zinc-600">{CONCLUSOES[c.conclusao!].encaminhamento}</td>
                        </tr>
                      );
                    }),
                )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-2">* Setor fora da avaliação do Eixo 2: entra como ×1,00.</p>
      </section>

      {/* 4 — PGR */}
      <section aria-label="Riscos para o PGR">
        <TituloSecao numero={4} titulo="Riscos existentes que vão para o PGR" />
        <p className="text-sm text-zinc-500 mb-3">Apenas resultados finais acima de 4,00 — respeitando os filtros.</p>
        {pgr.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum fator acima de 4,00.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {pgr.map((r) => (
              <article key={`${r.setor}-${r.fator.id}`} className="rounded-lg border border-red-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-zinc-900">
                    {r.setor} · {r.fator.nome}
                  </h3>
                  <span className="flex items-center gap-2 text-sm">
                    <Risco valor={r.celula.final} conclusao={r.celula.conclusao} grande />
                    <span className="text-zinc-500">nota {notaDoRisco(r.celula.final!)}</span>
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-3">Fator de risco PGR: {r.fator.fatorRisco}</p>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">Possíveis consequências</dt>
                    <dd className="text-zinc-700">{r.apoio.consequencias.join(" ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">CID F compatíveis (matriz)</dt>
                    <dd className="text-zinc-700">{r.apoio.cids.join(", ") || "Não específico"}</dd>
                    {r.celula.cidsEixo3.length > 0 && (
                      <dd className="text-red-700 text-xs mt-1">Registrados no setor e relacionados ao trabalho: {r.celula.cidsEixo3.join(", ")}</dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">Observação técnica</dt>
                    <dd className="text-zinc-700">{r.apoio.observacoes.join(" ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500">
                      {r.planos.length > 0 ? "Plano de ação registrado (Eixo 2)" : "Possibilidades de intervenção"}
                    </dt>
                    <dd className="text-zinc-700 whitespace-pre-line">
                      {r.planos.length > 0 ? r.planos.join("\n\n") : r.planosSugeridos.map((p) => `- ${p}`).join("\n")}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </ShellGestor>
  );
}
