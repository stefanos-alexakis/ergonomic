import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { OPCOES_ESCALA, calcularDistribuicao } from "@/lib/distribuicao-respostas";
import { CONCLUSOES, concluir, formatarRisco } from "@/lib/score-final";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);

/**
 * Distribuição das respostas do Eixo 1: quantas pessoas marcaram cada
 * opção de cada pergunta, por fator, com filtro de setor.
 */
export default async function DistribuicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setor?: string }>;
}) {
  const { id } = await params;
  const { setor } = await searchParams;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  const d = await calcularDistribuicao(pesquisa.id, setor);
  const visiveis = d.setores.filter((s) => !s.suprimido);
  const ocultos = d.setores.length - visiveis.length;
  const base = `/gestor/pesquisas/${pesquisa.id}/dashboard`;

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader eyebrow={pesquisa.nome} title="Distribuição das respostas" />

      {!d.suficiente ? (
        <p className="text-sm text-zinc-500">
          Ainda não há respostas concluídas suficientes para exibir com segurança (mínimo de {d.limite}).
        </p>
      ) : (
        <>
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Setor
              <Select name="setor" defaultValue={d.setorSelecionado?.id ?? ""} className="w-56">
                <option value="">Todos os setores</option>
                {visiveis.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.total})
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            <a
              href={`${base}/distribuicao/excel`}
              className="ml-auto text-sm font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
            >
              Baixar Excel (uma aba por setor)
            </a>
          </form>

          <p className="text-sm text-zinc-700 mb-1" data-testid="respondentes">
            <strong>{d.respondentes} respondentes</strong>, {d.setorSelecionado?.nome ?? "todos os setores"}
          </p>
          <p className="text-xs text-zinc-500 mb-6 max-w-3xl">
            Em destaque (vermelho), as perguntas em que 50% ou mais dos respondentes marcaram Frequentemente ou Sempre —
            a mesma definição de “exposto” da metodologia. O índice do fator usa a mesma régua do Painel FRPRT.
            {ocultos > 0 &&
              ` ${ocultos} setor(es) com menos de ${d.limite} respostas não aparecem separados, para proteger o anonimato.`}
          </p>

          <div className="flex flex-col gap-8">
            {d.fatores.map((f) => {
              const c = f.indice !== null ? CONCLUSOES[concluir(f.indice)] : null;
              return (
                <section key={f.id} aria-label={f.nome}>
                  <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900">
                    {f.nome}
                    {c && f.indice !== null && (
                      <span className="rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums" style={{ background: c.fundo, color: c.cor }}>
                        índice {formatarRisco(f.indice)} · {c.curto}
                      </span>
                    )}
                  </h2>
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-xs text-zinc-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Pergunta</th>
                          {OPCOES_ESCALA.map((o) => (
                            <th key={o.valor} className="px-2 py-2 text-center font-medium w-24">
                              {o.rotulo}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center font-medium w-24" title="Frequentemente + Sempre">
                            % expostos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {f.linhas.map((l) => (
                          <tr
                            key={l.pergunta.id}
                            className={`border-t border-zinc-100 ${l.destaque ? "bg-red-50" : ""}`}
                            data-destaque={l.destaque ? "sim" : undefined}
                          >
                            <td className="px-3 py-2 text-zinc-800">
                              <span className="text-zinc-400">{l.pergunta.numero}.</span> {l.pergunta.texto}
                            </td>
                            {OPCOES_ESCALA.map((o) => {
                              const exposta = l.destaque && o.valor >= 4 && l.contagem[o.valor] > 0;
                              return (
                                <td
                                  key={o.valor}
                                  className={`px-2 py-2 text-center tabular-nums ${exposta ? "bg-red-600 font-semibold text-white" : "text-zinc-700"}`}
                                >
                                  {l.contagem[o.valor] || ""}
                                </td>
                              );
                            })}
                            <td className={`px-2 py-2 text-center tabular-nums ${l.destaque ? "font-semibold text-red-700" : "text-zinc-500"}`}>
                              {pct(l.parcelaExpostos)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-8">
        <Link href={base} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar ao painel da pesquisa
        </Link>
      </p>
    </AppShell>
  );
}
