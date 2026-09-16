import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { calcularDashboard, type ResumoGrupo } from "@/lib/dashboard";
import type { GrupoComSupressao } from "@/lib/agregacao";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e funções" }];

function TabelaGrupo({ titulo, grupos }: { titulo: string; grupos: GrupoComSupressao<ResumoGrupo>[] }) {
  if (grupos.length === 0) return null;
  return (
    <section className="mb-6">
      <h3 className="text-sm font-semibold text-zinc-900 mb-2">{titulo}</h3>
      <Table>
        <Thead>
          <Tr>
            <Th>Grupo</Th>
            <Th>Respostas</Th>
            <Th>Média de risco (1–5)</Th>
          </Tr>
        </Thead>
        <tbody>
          {grupos.map((g) => (
            <Tr key={g.nome}>
              <Td className="font-medium text-zinc-900">{g.nome}</Td>
              {g.suprimido ? (
                <Td colSpan={2} className="text-zinc-400">
                  Dados insuficientes para exibir com segurança
                </Td>
              ) : (
                <>
                  <Td>{g.total}</Td>
                  <Td className="font-medium">{g.mediaGeral.toFixed(2)}</Td>
                </>
              )}
            </Tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}

function Contador({ valor, rotulo, testId }: { valor: number; rotulo: string; testId: string }) {
  return (
    <div>
      <div data-testid={testId} className="text-2xl font-semibold text-zinc-900">
        {valor}
      </div>
      <div className="text-sm text-zinc-500">{rotulo}</div>
    </div>
  );
}

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  const dashboard = await calcularDashboard(pesquisa.id);

  return (
    <AppShell contexto={workspace.nome} homeHref="/gestor" nav={NAV} accentColor={workspace.corPrimaria} secondaryColor={workspace.corSecundaria}>
      <PageHeader eyebrow={pesquisa.nome} title="Painel" />

      <div className="flex gap-10 mb-8">
        <Contador testId="contador-distribuidos" valor={dashboard.contadores.distribuidos} rotulo="códigos distribuídos" />
        <Contador testId="contador-iniciadas" valor={dashboard.contadores.iniciadas} rotulo="iniciadas" />
        <Contador testId="contador-concluidas" valor={dashboard.contadores.concluidas} rotulo="concluídas" />
      </div>

      {!dashboard.suficiente ? (
        <p className="text-sm text-zinc-500">
          Ainda não há respostas concluídas suficientes para exibir indicadores com segurança
          (mínimo de {dashboard.limiteSupressaoGrupo} respostas).
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-700 mb-6">
            Média geral de risco: <strong className="font-semibold">{dashboard.mediaGeral?.toFixed(2)}</strong>{" "}
            <span className="text-zinc-500">(escala 1–5, quanto maior, mais exposição a risco)</span>
          </p>

          <section className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Por dimensão</h3>
            <Table>
              <tbody>
                {dashboard.porDimensao.map((d) => (
                  <Tr key={d.nome}>
                    <Td className="text-zinc-900">{d.nome}</Td>
                    <Td className="font-medium">{d.media.toFixed(2)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </section>

          <TabelaGrupo titulo="Por setor" grupos={dashboard.porSetor} />
          <TabelaGrupo titulo="Por departamento" grupos={dashboard.porDepartamento} />
          <TabelaGrupo titulo="Por segmento" grupos={dashboard.porSegmento} />
          <TabelaGrupo titulo="Por função" grupos={dashboard.porFuncao} />

          <p className="text-sm">
            <a href={`/gestor/pesquisas/${pesquisa.id}/dashboard/relatorio`} className="font-medium text-zinc-900 hover:underline">
              Baixar relatório em PDF
            </a>
          </p>
        </>
      )}

      <p className="mt-8">
        <Link href={`/gestor/pesquisas/${pesquisa.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
      </p>
    </AppShell>
  );
}
