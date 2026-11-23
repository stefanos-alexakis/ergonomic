import Link from "next/link";
import { db } from "@/lib/db";
import { opcoesPainel } from "@/lib/painel-frprt";
import { carregarRascunho, type FontesEmitidas } from "@/lib/relatorio/relatorio-completo";
import { carregarTextosFinal, listarEmitidosFinal, montarDadosRelatorioFinal } from "@/lib/relatorio/relatorio-final";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoGestor } from "../../eixo2/contexto";
import { RelatorioFinalForm } from "./form";

export const dynamic = "force-dynamic";

const kb = (b: number) => `${Math.max(1, Math.round(b / 1024)).toLocaleString("pt-BR")} KB`;

/**
 * Relatório final no modelo da cliente (nov/2026): a consultoria redige e
 * emite; o gestor vê e baixa as versões emitidas.
 */
export default async function RelatorioFinalPage() {
  const { actor, workspace } = await contextoGestor();
  const consultoria = actor.isPlatformAdmin;
  const [emitidos, ultima, rascunho, textos, opcoes] = await Promise.all([
    listarEmitidosFinal(workspace.id),
    db.relatorioEmitido.findFirst({ where: { workspaceId: workspace.id }, orderBy: { versao: "desc" }, select: { versao: true } }),
    consultoria ? carregarRascunho(workspace.id) : null,
    consultoria ? carregarTextosFinal(workspace.id) : null,
    consultoria ? opcoesPainel(workspace.id, {}) : null,
  ]);
  // Os textos gerados pelo sistema dependem das fontes do rascunho.
  const dados = consultoria && rascunho && textos ? await montarDadosRelatorioFinal(workspace, rascunho, textos, null) : null;
  const proximaVersao = (ultima?.versao ?? 0) + 1;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader eyebrow="Painel FRPRT" title="Relatório final (modelo da consultoria)" />
      <div className="max-w-4xl flex flex-col gap-8">
        <p className="text-sm text-zinc-600">
          Documento no modelo da consultoria: responsáveis, objetivo, introdução, legislação (NR-1 e Lei 14.457), metodologia
          e correspondência legal, implementação, resultados dos Eixos 1 a 3 (distribuição, positividade, painel de
          atestados), cruzamento analítico com a conta de cada setor, plano de ação, conclusão, monitoramento, PGR e
          referências. Cada emissão grava uma versão.
        </p>

        {consultoria && rascunho && textos && opcoes && dados ? (
          <section aria-label="Rascunho">
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">Rascunho (consultoria)</h2>
            <RelatorioFinalForm
              valores={{
                pesquisaId: rascunho.pesquisaId,
                avaliacaoId: rascunho.avaliacaoId,
                levantamentoId: rascunho.levantamentoId,
                conclusao: rascunho.conclusao ?? "",
                cruzamentoAnalitico: textos.cruzamentoAnalitico ?? "",
                resumoEixo2: dados.textos.resumoEixo2,
                observacaoEixo2: dados.textos.observacaoEixo2,
                fontesInternas: dados.textos.fontesInternas,
              }}
              padroes={dados.padroes}
              pesquisas={opcoes.pesquisas.map((p) => ({ id: p.id, nome: p.nome }))}
              avaliacoes={opcoes.avaliacoes.map((a) => ({ id: a.id, nome: `${a.nome}${a.status === "CONCLUIDA" ? "" : " (em andamento)"}` }))}
              levantamentos={opcoes.levantamentos.map((l) => ({ id: l.id, nome: l.nome }))}
              proximaVersao={proximaVersao}
            />
          </section>
        ) : (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            O relatório final é redigido e emitido pela consultoria. As versões emitidas aparecem abaixo para download.
          </p>
        )}

        <section aria-label="Versões emitidas">
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Versões emitidas</h2>
          {emitidos.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhuma versão emitida ainda.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Versão</th>
                    <th className="px-3 py-2 text-left font-medium">Emitida em</th>
                    <th className="px-3 py-2 text-left font-medium">Por</th>
                    <th className="px-3 py-2 text-left font-medium">Fontes</th>
                    <th className="px-3 py-2 text-left font-medium">Arquivo</th>
                  </tr>
                </thead>
                <tbody>
                  {emitidos.map((e) => {
                    const f = e.fontes as FontesEmitidas;
                    return (
                      <tr key={e.id} className="border-t border-zinc-100 align-top">
                        <td className="px-3 py-2 font-semibold">v{e.versao}</td>
                        <td className="px-3 py-2 tabular-nums">{e.emitidoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                        <td className="px-3 py-2">{e.emitidoPorNome}</td>
                        <td className="px-3 py-2 text-xs text-zinc-600">
                          {[f.pesquisa && `E1: ${f.pesquisa}`, f.avaliacao && `E2: ${f.avaliacao}`, f.levantamento && `E3: ${f.levantamento}`]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={`/gestor/painel/relatorio-final/versao/${e.versao}`}
                            className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
                          >
                            Baixar PDF
                          </a>{" "}
                          <span className="text-xs text-zinc-400">({kb(e.tamanhoBytes)})</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-zinc-500">
            A numeração das versões é compartilhada com o relatório completo (uma sequência por empresa).
          </p>
        </section>

        <p>
          <Link href="/gestor/painel" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Voltar ao Painel FRPRT
          </Link>
        </p>
      </div>
    </ShellGestor>
  );
}
