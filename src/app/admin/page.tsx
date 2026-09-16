import Link from "next/link";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Depende de dados de banco em tempo real e de sessão autenticada —
// nunca deve ser pré-renderizada estaticamente no build.
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const actor = await getActor();
  const usuario = actor ? await db.user.findUnique({ where: { id: actor.userId } }) : null;
  const empresas = await db.workspace.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pesquisas: true } } },
  });

  return (
    <AppShell contexto="Administração" homeHref="/admin" userLabel={usuario?.email} nav={[]}>
      <PageHeader
        eyebrow="Plataforma"
        title="Empresas clientes"
        actions={
          <Link href="/admin/empresas/nova">
            <Button>+ Nova empresa</Button>
          </Link>
        }
      />

      {empresas.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Empresa</Th>
              <Th>Slug</Th>
              <Th>Pesquisas</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <tbody>
            {empresas.map((e) => (
              <Tr key={e.id}>
                <Td>
                  <Link href={`/admin/empresas/${e.id}/editar`} className="font-medium text-zinc-900 hover:underline">
                    {e.nome}
                  </Link>
                </Td>
                <Td>
                  <code className="text-xs text-zinc-500">{e.slug}</code>
                </Td>
                <Td>{e._count.pesquisas}</Td>
                <Td>
                  <Badge tom={e.isActive ? "sucesso" : "neutro"}>{e.isActive ? "Ativa" : "Inativa"}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </AppShell>
  );
}
