import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { db } from "@/lib/db";
import { AppShell } from "@/components/shell/app-shell";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e departamentos" }];

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
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader
        eyebrow={workspace.nome}
        title="Pesquisas"
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
                  <Badge>{p.status}</Badge>
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
