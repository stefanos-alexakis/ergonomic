import Link from "next/link";
import { opcoesPainel } from "@/lib/painel-frprt";
import { listarConsultores } from "@/lib/consultores";
import { carregarRascunho, listarEmitidos, type FontesEmitidas } from "@/lib/relatorio/relatorio-completo";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { contextoGestor } from "../../eixo2/contexto";
import { RascunhoForm } from "./form";

export const dynamic = "force-dynamic";

const kb = (b: number) => `${Math.max(1, Math.round(b / 1024)).toLocaleString("pt-BR")} KB`;

/**
 * Relatório completo: a consultoria redige o rascunho e emite versões; o
 * gestor da empresa vê e baixa as versões emitidas.
 */
export default async function RelatorioCompletoPage() {
  const { actor, workspace } = await contextoGestor();
  const consultoria = actor.isPlatformAdmin;
  const [emitidos, rascunho, opcoes, consultores] = await Promise.all([
    listarEmitidos(workspace.id),
    consultoria ? carregarRascunho(workspace.id) : null,
    consultoria ? opcoesPainel(workspace.id, {}) : null,
    consultoria ? listarConsultores() : [],
  ]);
  const proximaVersao = (emitidos[0]?.versao ?? 0) + 1;

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader eyebrow="Painel FRPRT" title="Relatório completo" />
      <div className="max-w-4xl flex flex-col gap-8">
        <p className="text-sm text-zinc-600">
          Documento único com capa, dossiê da legislação, metodologia e anonimato, Eixos 1 a 3, Painel FRPRT (índices,
          FMEA e PGR), plano de ação, conclusão do consultor e responsáveis técnicos. Cada emissão grava uma versão — os
          prazos da FMEA contam da data de emissão.
        </p>

        {consultoria && rascunho && opcoes ? (
          <section aria-label="Rascunho">
            <h2 className="text-sm font-semibold text-zinc-900 mb-2">Rascunho (consultoria)</h2>
            {workspace.logoUrl?.endsWith(".webp") && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                O logo da empresa está em WebP, formato que o PDF não aceita — a capa sai sem logo. Envie o logo em PNG ou
                JPG no cadastro da empresa.
              </p>
            )}
            <RascunhoForm
              valores={{
                pesquisaId: rascunho.pesquisaId,
                avaliacaoId: rascunho.avaliacaoId,
                levantamentoId: rascunho.levantamentoId,
                conclusao: rascunho.conclusao ?? "",
                consultorIds: rascunho.consultorIds,
              }}
              pesquisas={opcoes.pesquisas.map((p) => ({ id: p.id, nome: p.nome }))}
              avaliacoes={opcoes.avaliacoes.map((a) => ({ id: a.id, nome: `${a.nome}${a.status === "CONCLUIDA" ? "" : " (em andamento)"}` }))}
              levantamentos={opcoes.levantamentos.map((l) => ({ id: l.id, nome: l.nome }))}
              consultores={consultores.map((c) => ({
                id: c.id,
                nome: c.nome,
                detalhe: [c.formacao, c.registro, c.cargo].filter(Boolean).join(" · "),
              }))}
              proximaVersao={proximaVersao}
            />
          </section>
        ) : (
          <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            O relatório completo é redigido e emitido pela consultoria. As versões emitidas aparecem abaixo para download.
          </p>
        )}

        <section aria-label="Versões emitidas">
          <h2 className="text-sm font-semibold text-zinc-900 mb-2">Versões emitidas</h2>
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
                            href={`/gestor/painel/relatorio-completo/versao/${e.versao}`}
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
