import Link from "next/link";
import { notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { listarSugestoes } from "@/lib/sugestoes-melhoria-consulta";
import { PERGUNTA_SUGESTAO } from "@/lib/sugestao-melhoria";
import { AppShell } from "@/components/shell/app-shell";
import { GRUPOS_GESTOR, NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * Sugestões de melhoria (pergunta aberta final, opcional), por setor.
 * Fora do PDF: serve para consulta e análise posterior.
 */
export default async function SugestoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setor?: string; q?: string }>;
}) {
  const { id } = await params;
  const { setor, q } = await searchParams;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  const d = await listarSugestoes(pesquisa.id, setor);
  const busca = (q ?? "").trim().toLocaleLowerCase("pt-BR");
  const itens = busca ? d.itens.filter((i) => i.texto.toLocaleLowerCase("pt-BR").includes(busca)) : d.itens;
  const base = `/gestor/pesquisas/${pesquisa.id}/dashboard`;

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV_GESTOR}
      grupos={GRUPOS_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader eyebrow={pesquisa.nome} title="Sugestões de melhoria" />

      <p className="text-sm text-zinc-500 mb-1 max-w-3xl">“{PERGUNTA_SUGESTAO}”</p>
      <p className="text-xs text-zinc-500 mb-6 max-w-3xl">
        Pergunta aberta e opcional, no fim do questionário. Cada texto aparece com o setor de quem escreveu, sem data nem
        outro dado pessoal. Estas respostas não entram no relatório em PDF.
      </p>

      {d.total === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="sem-sugestoes">
          Ainda não há sugestões registradas nesta pesquisa.
        </p>
      ) : (
        <>
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 p-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Setor
              <Select name="setor" defaultValue={setor ?? ""} className="w-56">
                <option value="">Todos os setores</option>
                {d.setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.total})
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
              Buscar no texto
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                className="h-10 w-56 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900"
              />
            </label>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            <a
              href={`${base}/sugestoes/excel`}
              className="ml-auto text-sm font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
            >
              Baixar Excel
            </a>
          </form>

          <p className="text-sm text-zinc-700 mb-4" data-testid="total-sugestoes">
            <strong>{itens.length}</strong> {itens.length === 1 ? "sugestão exibida" : "sugestões exibidas"} · {d.total} no
            total, de {d.respostasConcluidas} respostas concluídas
          </p>

          <ul className="flex flex-col gap-3">
            {itens.map((i, n) => (
              <li key={n} className="rounded-lg border border-zinc-200 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{i.setor}</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{i.texto}</p>
              </li>
            ))}
          </ul>
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
