import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { listarCatalogoOrganizacional } from "@/lib/estrutura";
import {
  calcularDashboard,
  calcularScoreBase,
  calcularNivelRisco,
  SCORE_BASE_MINIMO,
  type ResumoGrupo,
} from "@/lib/dashboard";
import type { GrupoComSupressao } from "@/lib/agregacao";
import { AppShell } from "@/components/shell/app-shell";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e departamentos" }];

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
            <Th>Score Base</Th>
          </Tr>
        </Thead>
        <tbody>
          {grupos.map((g) => (
            <Tr key={g.nome}>
              <Td className="font-medium text-zinc-900">{g.nome}</Td>
              {g.suprimido ? (
                <Td colSpan={3} className="text-zinc-400">
                  Dados insuficientes para exibir com segurança
                </Td>
              ) : (
                <>
                  <Td>{g.total}</Td>
                  <Td className="font-medium">{g.mediaGeral.toFixed(2)}</Td>
                  <Td className="font-medium">
                    <span className="flex items-center gap-2">
                      {calcularScoreBase(g.mediaGeral)}
                      <Badge tom={calcularNivelRisco(calcularScoreBase(g.mediaGeral)).tom}>
                        {calcularNivelRisco(calcularScoreBase(g.mediaGeral)).rotulo}
                      </Badge>
                    </span>
                  </Td>
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

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ setorId?: string; departamentoId?: string }>;
}) {
  const { id } = await params;
  const filtros = await searchParams;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  const [dashboard, catalogo] = await Promise.all([
    calcularDashboard(pesquisa.id, filtros),
    listarCatalogoOrganizacional(workspace.id),
  ]);

  const filtroAtivo = Boolean(filtros.setorId || filtros.departamentoId);
  const queryRespostas = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      nav={NAV}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
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
          <form className="flex flex-wrap items-end gap-3 mb-8 rounded-lg border border-zinc-200 p-4" method="get">
            <div className="flex flex-col gap-1">
              <label htmlFor="setorId" className="text-xs font-medium text-zinc-500">
                Setor
              </label>
              <Select id="setorId" name="setorId" defaultValue={filtros.setorId ?? ""} className="w-44">
                <option value="">Todos</option>
                {catalogo.setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="departamentoId" className="text-xs font-medium text-zinc-500">
                Departamento
              </label>
              <Select id="departamentoId" name="departamentoId" defaultValue={filtros.departamentoId ?? ""} className="w-44">
                <option value="">Todos</option>
                {catalogo.departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {filtroAtivo && (
              <Link href={`/gestor/pesquisas/${pesquisa.id}/dashboard`} className="text-sm text-zinc-500 hover:text-zinc-900">
                Limpar filtro
              </Link>
            )}
          </form>

          {dashboard.filtroSuprimido ? (
            <p className="text-sm text-zinc-500 mb-6">
              Esse filtro reúne só {dashboard.totalFiltrado}{" "}
              {dashboard.totalFiltrado === 1 ? "resposta" : "respostas"} — abaixo do mínimo de{" "}
              {dashboard.limiteSupressaoGrupo} para exibir com segurança (evita identificar quem respondeu).
              Tente um filtro mais amplo.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 mb-6 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-zinc-900">{dashboard.scoreBase}</span>
                <Badge tom={calcularNivelRisco(dashboard.scoreBase!).tom}>
                  {calcularNivelRisco(dashboard.scoreBase!).rotulo}
                </Badge>
                <span className="text-sm text-zinc-500">
                  / {dashboard.scoreBaseMaximo} pontos — Score Base (Eixo 1: percepção dos colaboradores). Quanto
                  maior, melhor. Mesmo no cenário mais grave a nota não zera (piso de {SCORE_BASE_MINIMO} pontos) —
                  isso mantém espaço para os Eixos 2 e 3 (ainda não implementados) ajustarem o resultado nos{" "}
                  {1000 - dashboard.scoreBaseMaximo} pontos restantes.
                </span>
              </div>

              <p className="text-sm text-zinc-700 mb-6">
                Média geral de risco: <strong className="font-semibold">{dashboard.mediaGeral?.toFixed(2)}</strong>{" "}
                <span className="text-zinc-500">(escala 1–5, quanto maior, mais exposição a risco)</span> ·{" "}
                {dashboard.totalFiltrado} {dashboard.totalFiltrado === 1 ? "resposta considerada" : "respostas consideradas"}
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

              {!filtroAtivo && (
                <>
                  <TabelaGrupo titulo="Por setor" grupos={dashboard.porSetor} />
                  <TabelaGrupo titulo="Por departamento" grupos={dashboard.porDepartamento} />
                </>
              )}

              <p className="text-sm mb-2">
                <Link
                  href={`/gestor/pesquisas/${pesquisa.id}/dashboard/respostas${queryRespostas ? `?${queryRespostas}` : ""}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  Ver respostas individuais →
                </Link>
              </p>

              <p className="text-sm">
                <a href={`/gestor/pesquisas/${pesquisa.id}/dashboard/relatorio`} className="font-medium text-zinc-900 hover:underline">
                  Baixar relatório em PDF
                </a>
              </p>
            </>
          )}
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
