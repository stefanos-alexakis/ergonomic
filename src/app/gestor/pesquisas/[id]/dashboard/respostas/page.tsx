import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { calcularDashboard, listarRespostasIndividuais } from "@/lib/dashboard";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e funções" }];

export default async function RespostasIndividuaisPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setorId?: string; departamentoId?: string; segmentoId?: string; funcaoId?: string }>;
}) {
  const { id } = await params;
  const filtros = await searchParams;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  // A mesma regra de supressão do dashboard agregado vale aqui — nunca
  // liberar navegação individual pra um recorte menor que o limite
  // (constitution.md §3: reidentificação por afunilamento de filtro).
  const dashboard = await calcularDashboard(pesquisa.id, filtros);
  if (!dashboard.suficiente || dashboard.filtroSuprimido) notFound();

  const respostas = await listarRespostasIndividuais(pesquisa.id, filtros);

  return (
    <AppShell contexto={workspace.nome} homeHref="/gestor" nav={NAV} accentColor={workspace.corPrimaria} secondaryColor={workspace.corSecundaria}>
      <PageHeader eyebrow={pesquisa.nome} title="Respostas individuais" />

      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        Cada linha é uma resposta anônima — nenhum dado identifica quem respondeu (nome, e-mail,
        matrícula). Só a organização declarada (setor/departamento/segmento/função) e as respostas
        em si.
      </p>

      <Table>
        <Thead>
          <Tr>
            <Th>Concluída em</Th>
            <Th>Setor</Th>
            <Th>Departamento</Th>
            <Th>Segmento</Th>
            <Th>Função</Th>
            <Th>Score Base</Th>
          </Tr>
        </Thead>
        <tbody>
          {respostas.map((r) => (
            <Tr key={r.id}>
              <Td className="text-zinc-500">{r.concluidoEm.toLocaleDateString("pt-BR")}</Td>
              <Td>{r.setor ?? "—"}</Td>
              <Td>{r.departamento ?? "—"}</Td>
              <Td>{r.segmento ?? "—"}</Td>
              <Td>{r.funcao ?? "—"}</Td>
              <Td>
                <Link
                  href={`/gestor/pesquisas/${pesquisa.id}/dashboard/respostas/${r.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {r.scoreBase} →
                </Link>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <p className="mt-8">
        <Link href={`/gestor/pesquisas/${pesquisa.id}/dashboard`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar ao painel
        </Link>
      </p>
    </AppShell>
  );
}
