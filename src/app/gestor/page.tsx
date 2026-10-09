import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { BadgeStatusPesquisa } from "@/components/ui/badge-status-pesquisa";

export const dynamic = "force-dynamic";

const NAV = NAV_GESTOR;

export default async function GestorHomePage() {
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

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      userLabel={usuario?.email}
      nav={NAV}
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
            {pesquisas.map((p) => (
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
    </AppShell>
  );
}
