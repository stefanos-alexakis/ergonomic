import Link from "next/link";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_ADMIN } from "@/components/shell/nav-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { filtrarPorNome } from "@/lib/filtro-nome";
import { Input } from "@/components/ui/input";
import { assumirVisaoGestorAction, definirStatusEmpresaAction } from "./actions";

// Depende de dados de banco em tempo real e de sessão autenticada —
// nunca deve ser pré-renderizada estaticamente no build.
export const dynamic = "force-dynamic";

const NAV = NAV_ADMIN;

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const actor = await getActor();
  const usuario = actor ? await db.user.findUnique({ where: { id: actor.userId } }) : null;
  const todas = await db.workspace.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pesquisas: true } } },
  });
  // Filtro por parte do nome (sem diferenciar maiúsculas nem acentos).
  const empresas = filtrarPorNome(todas, q);
  const busca = (q ?? "").trim();

  return (
    <AppShell contexto="Administração" homeHref="/admin" userLabel={usuario?.email} nav={NAV}>
      <PageHeader
        eyebrow="Plataforma"
        title="Empresas clientes"
        actions={
          <Link href="/admin/empresas/nova">
            <Button>+ Nova empresa</Button>
          </Link>
        }
      />

      {todas.length > 0 && (
        <form method="get" role="search" className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="busca-empresa" className="sr-only">
            Buscar empresa pelo nome
          </label>
          <Input
            id="busca-empresa"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar empresa pelo nome"
            className="w-72"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
          {busca && (
            <Link href="/admin" className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline">
              Limpar
            </Link>
          )}
          <span className="text-sm text-zinc-500" data-testid="contagem-empresas">
            {busca ? `${empresas.length} de ${todas.length} empresas` : `${todas.length} empresas`}
          </span>
        </form>
      )}

      {todas.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma empresa cadastrada ainda.</p>
      ) : empresas.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="sem-resultado-empresas">
          Nenhuma empresa encontrada para “{busca}”.
        </p>
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
                  <span className="flex items-center gap-2">
                    <Link href={`/admin/empresas/${e.id}/editar`} className="font-medium text-zinc-900 hover:underline">
                      {e.nome}
                    </Link>
                    {e.isActive && (
                      <form action={assumirVisaoGestorAction.bind(null, e.id)}>
                        <button
                          type="submit"
                          title="Acessar como gestor desta empresa"
                          aria-label="Acessar como gestor desta empresa"
                          className="text-zinc-400 hover:text-zinc-900 cursor-pointer"
                        >
                          →
                        </button>
                      </form>
                    )}
                  </span>
                </Td>
                <Td>
                  <code className="text-xs text-zinc-500">{e.slug}</code>
                </Td>
                <Td>{e._count.pesquisas}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <Badge tom={e.isActive ? "sucesso" : "neutro"}>{e.isActive ? "Ativa" : "Inativa"}</Badge>
                    <form action={definirStatusEmpresaAction.bind(null, e.id, !e.isActive)}>
                      <button
                        type="submit"
                        aria-label={`${e.isActive ? "Inativar" : "Ativar"} ${e.nome}`}
                        className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline cursor-pointer"
                      >
                        {e.isActive ? "inativar" : "ativar"}
                      </button>
                    </form>
                  </span>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </AppShell>
  );
}
