import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { calcularNivelRisco } from "@/lib/dashboard";
import { cruzamentoPrePesquisa } from "@/lib/perfil-participantes";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

/**
 * Cruzamento da pré-pesquisa com setor e com o índice do Eixo 1 — SÓ o
 * admin da plataforma (o gestor da empresa vê apenas os totais
 * separados). Sempre agregado: grupo abaixo do mínimo não mostra índice,
 * e célula pequena aparece como "< mínimo".
 */
export default async function PrePesquisaAdminPage({ searchParams }: { searchParams: Promise<{ pesquisa?: string }> }) {
  // Não depender só do middleware — mesmo padrão das outras telas do admin.
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();
  const { pesquisa: pesquisaId } = await searchParams;

  const pesquisas = await db.pesquisa.findMany({
    where: { prePesquisas: { some: {} } },
    select: { id: true, nome: true, workspace: { select: { nome: true } }, _count: { select: { prePesquisas: true } } },
    orderBy: { createdAt: "desc" },
  });
  const selecionada = pesquisas.find((p) => p.id === pesquisaId) ?? null;
  const cruzamento = selecionada ? await cruzamentoPrePesquisa(selecionada.id) : null;
  const virgula = (x: number) => x.toFixed(2).replace(".", ",");

  return (
    <AppShell contexto="Administração" homeHref="/admin" nav={NAV_ADMIN}>
      <PageHeader eyebrow="Plataforma · acesso restrito ao admin" title="Pré-pesquisa: cruzamentos" />
      <p className="text-sm text-zinc-600 mb-6 max-w-3xl">
        Perfil dos participantes cruzado com o setor e com o índice do Eixo 1. Esta visão é exclusiva dos administradores
        da plataforma — o gestor da empresa vê só os totais, separados. Grupos com menos respostas que o mínimo da pesquisa
        não mostram índice, e células pequenas aparecem como “&lt; mín.”.
      </p>

      {pesquisas.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma pesquisa com pré-pesquisa respondida ainda.</p>
      ) : (
        <form method="get" className="mb-8 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Pesquisa
            <select name="pesquisa" defaultValue={selecionada?.id ?? ""} className="h-9 rounded-md border border-zinc-300 px-2 text-sm text-zinc-900">
              <option value="" disabled>
                Selecione
              </option>
              {pesquisas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.workspace.nome} — {p.nome} ({p._count.prePesquisas})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50 cursor-pointer">
            Ver cruzamento
          </button>
        </form>
      )}

      {cruzamento && (
        <>
          <p className="text-sm text-zinc-700 mb-4">
            {cruzamento.total} pré-pesquisa(s) de respostas concluídas · mínimo por grupo: {cruzamento.limite}
          </p>
          <div className="flex flex-col gap-8">
            {cruzamento.perguntas.map((p) => (
              <section key={p.chave} aria-label={p.rotulo}>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">{p.rotulo}</h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-xs text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Resposta</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        <th className="px-3 py-2 text-left font-medium">Índice Eixo 1</th>
                        {cruzamento.setores.map((s) => (
                          <th key={s.id} className="px-3 py-2 text-right font-medium">
                            {s.nome}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {p.linhas
                        .filter((l) => l.total > 0)
                        .map((l) => (
                          <tr key={l.valor ?? "nulo"} className="border-t border-zinc-100">
                            <td className="px-3 py-2 text-zinc-900">{l.rotulo}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{l.total}</td>
                            <td className="px-3 py-2">
                              {l.indiceEixo1 !== null ? (
                                <Badge tom={calcularNivelRisco(l.indiceEixo1).tom}>
                                  {`${virgula(l.indiceEixo1)} · ${calcularNivelRisco(l.indiceEixo1).rotulo}`}
                                </Badge>
                              ) : (
                                <span className="text-xs text-zinc-400">&lt; mín.</span>
                              )}
                            </td>
                            {l.porSetor.map((c, i) => (
                              <td key={cruzamento.setores[i]!.id} className="px-3 py-2 text-right tabular-nums text-zinc-700">
                                {c.n === 0 ? "—" : c.visivel ? c.n : <span className="text-xs text-zinc-400">&lt; mín.</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <p className="mt-8">
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Empresas
        </Link>
      </p>
    </AppShell>
  );
}
