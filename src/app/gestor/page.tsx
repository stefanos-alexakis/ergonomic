import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { GRUPOS_GESTOR, NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { BadgeStatusPesquisa } from "@/components/ui/badge-status-pesquisa";
import { ROTULO_CLASSE_PESQUISA, classificarPesquisa, type ClasseListaPesquisa } from "@/lib/vigencia-pesquisa";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const NAV = NAV_GESTOR;

const ABAS = [
  { chave: "abertas", classe: "ABERTAS" },
  { chave: "concluidas", classe: "CONCLUIDAS" },
  { chave: "arquivadas", classe: "ARQUIVADAS" },
  { chave: "todas", classe: null },
] as const;

export default async function GestorHomePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba: abaParam } = await searchParams;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;

  const usuario = await db.user.findUnique({ where: { id: actor.userId } });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) {
    return (
      <AppShell contexto="Sem empresa" homeHref="/gestor" userLabel={usuario?.email} nav={[]}>
        <p className="text-sm text-zinc-500">Seu usuário ainda não está vinculado a uma empresa.</p>
      </AppShell>
    );
  }

  const pesquisas = await db.pesquisa.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { codigos: true } } },
  });

  // Abertas (em operação) · Concluídas (encerramento passou) · Arquivadas (pelo gestor).
  const agora = new Date();
  const comClasse = pesquisas.map((p) => ({ p, classe: classificarPesquisa(p, agora) }));
  const contagem: Record<ClasseListaPesquisa, number> = { ABERTAS: 0, CONCLUIDAS: 0, ARQUIVADAS: 0 };
  for (const { classe } of comClasse) contagem[classe]++;
  const aba = ABAS.find((a) => a.chave === abaParam) ?? ABAS[0];
  const visiveis = comClasse.filter(({ classe }) => aba.classe === null || classe === aba.classe).map(({ p }) => p);

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      userLabel={usuario?.email}
      nav={NAV}
      grupos={GRUPOS_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader
        eyebrow={workspace.nome}
        title="Eixo 1 · Pesquisa com os colaboradores"
        actions={
          <Link href="/gestor/pesquisas/nova">
            <Button>+ Nova pesquisa</Button>
          </Link>
        }
      />

      {pesquisas.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma pesquisa criada ainda.</p>
      ) : (
        <>
          <nav aria-label="Filtrar pesquisas" className="mb-4 flex flex-wrap gap-2">
            {ABAS.map((a) => {
              const ativa = a.chave === aba.chave;
              const total = a.classe === null ? pesquisas.length : contagem[a.classe];
              return (
                <Link
                  key={a.chave}
                  href={a.chave === "abertas" ? "/gestor" : `/gestor?aba=${a.chave}`}
                  aria-current={ativa ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 h-8 text-sm font-medium",
                    ativa
                      ? "border-[var(--ws-accent,#18181b)] bg-[var(--ws-accent,#18181b)] text-[var(--ws-on-accent,#ffffff)]"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
                  )}
                >
                  {a.classe === null ? "Todas" : ROTULO_CLASSE_PESQUISA[a.classe]}
                  <span className="tabular-nums text-xs opacity-80">{total}</span>
                </Link>
              );
            })}
          </nav>

          {visiveis.length === 0 ? (
            <p className="text-sm text-zinc-500" data-testid="lista-vazia">
              Nenhuma pesquisa {aba.classe ? `em “${ROTULO_CLASSE_PESQUISA[aba.classe]}”` : ""}.
            </p>
          ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Pesquisa</Th>
              <Th>Status</Th>
              <Th>Período</Th>
              <Th>Códigos</Th>
            </Tr>
          </Thead>
          <tbody>
            {visiveis.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link
                    href={`/gestor/pesquisas/${p.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {p.nome}
                  </Link>
                </Td>
                <Td>
                  <BadgeStatusPesquisa pesquisa={p} codigosGerados={p._count.codigos > 0} />
                </Td>
                <Td className="text-zinc-500">
                  {p.dataInicio.toLocaleDateString("pt-BR")} – {p.dataFim.toLocaleDateString("pt-BR")}
                </Td>
                <Td>{p._count.codigos}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
          )}
        </>
      )}
    </AppShell>
  );
}
