import { notFound } from "next/navigation";
import Link from "next/link";
import { perfilParticipantes } from "@/lib/perfil-participantes";
import { PerfilParticipantesSecao } from "@/components/pesquisa/perfil-participantes";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { listarCatalogoOrganizacional } from "@/lib/estrutura";
import {
  calcularDashboard,
  calcularNivelRisco,
  type ResumoGrupo,
} from "@/lib/dashboard";
import type { GrupoComSupressao } from "@/lib/agregacao";
import { CONCLUSOES, concluir, type Conclusao } from "@/lib/score-final";
import { AppShell } from "@/components/shell/app-shell";
import { NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const NAV = NAV_GESTOR;

/** Cor da faixa do índice de uma média 1–5 — mesmos cortes e cores do Painel FRPRT. */
function corDaMedia(media: number) {
  return CONCLUSOES[concluir(media)];
}

/** Média em pílula colorida: verde índice baixo, amarelo médio, vermelho alto. */
function PilulaMedia({ media }: { media: number }) {
  const c = corDaMedia(media);
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums"
      style={{ background: c.fundo, color: c.cor }}
      title={c.curto}
    >
      {media.toFixed(2)}
    </span>
  );
}

/** Barra 1–5 com a cor da faixa, para leitura rápida da tabela por dimensão. */
// Mesmas cores das faixas da régua do Painel FRPRT (verde, amarelo, vermelho).
const COR_BARRA: Record<Conclusao, string> = { SEM_RISCO: "#34d399", CONTROLE: "#fbbf24", RISCO_EXISTENTE: "#f87171" };

function BarraMedia({ media }: { media: number }) {
  const pct = Math.min(100, Math.max(0, ((media - 1) / 4) * 100));
  return (
    <div className="h-2 w-40 rounded-full bg-zinc-100 overflow-hidden" aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COR_BARRA[concluir(media)] }} />
    </div>
  );
}

function LegendaCores() {
  const faixas: [Conclusao, string][] = [
    ["SEM_RISCO", "até 3,00"],
    ["CONTROLE", "3,01 a 4,00"],
    ["RISCO_EXISTENTE", "acima de 4,00"],
  ];
  return (
    <div className="flex flex-wrap gap-2 text-xs mb-6" aria-label="Legenda de cores">
      {faixas.map(([k, faixa]) => (
        <span key={k} className="rounded-md px-2 py-1 font-medium" style={{ background: CONCLUSOES[k].fundo, color: CONCLUSOES[k].cor }}>
          {CONCLUSOES[k].curto} · média {faixa}
        </span>
      ))}
    </div>
  );
}

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
            <Th>Índice (1–5)</Th>
            <Th>Faixa</Th>
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
                  <Td>
                    <PilulaMedia media={g.mediaGeral} />
                  </Td>
                  <Td>
                    <Badge tom={calcularNivelRisco(g.mediaGeral).tom}>{calcularNivelRisco(g.mediaGeral).rotulo}</Badge>
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

  const [dashboard, catalogo, perfil] = await Promise.all([
    calcularDashboard(pesquisa.id, filtros),
    listarCatalogoOrganizacional(workspace.id),
    perfilParticipantes(pesquisa.id),
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
      logoUrl={workspace.logoUrl}
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
              <div
                className="rounded-lg border-2 px-5 py-4 mb-3 flex flex-wrap items-baseline gap-3"
                style={{ borderColor: corDaMedia(dashboard.mediaGeral!).cor, background: corDaMedia(dashboard.mediaGeral!).fundo }}
              >
                <span className="text-4xl font-bold tabular-nums" style={{ color: corDaMedia(dashboard.mediaGeral!).cor }}>
                  {dashboard.mediaGeral!.toFixed(2).replace(".", ",")}
                </span>
                <Badge tom={calcularNivelRisco(dashboard.mediaGeral!).tom}>
                  {calcularNivelRisco(dashboard.mediaGeral!).rotulo}
                </Badge>
                <span className="text-sm text-zinc-700">
                  Índice geral do Eixo 1 (percepção dos colaboradores), de 1 a 5 — quanto maior, mais exposição. Mesma
                  régua do Painel FRPRT: até 3,00 índice baixo · até 4,00 índice médio · acima disso índice alto. O
                  resultado final, com os Eixos 2 e 3, está no{" "}
                  <Link href="/gestor/painel" className="underline hover:no-underline">
                    Painel FRPRT
                  </Link>
                  .
                </span>
              </div>

              <LegendaCores />

              <p className="text-sm text-zinc-700 mb-6">
                {dashboard.totalFiltrado} {dashboard.totalFiltrado === 1 ? "resposta considerada" : "respostas consideradas"}
              </p>

              <section className="mb-6">
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Por dimensão</h3>
                <Table>
                  <tbody>
                    {dashboard.porDimensao.map((d) => (
                      <Tr key={d.nome}>
                        <Td className="text-zinc-900">{d.nome}</Td>
                        <Td className="w-44">
                          <BarraMedia media={d.media} />
                        </Td>
                        <Td className="w-20">
                          <PilulaMedia media={d.media} />
                        </Td>
                        <Td className="w-32 text-xs font-medium" style={{ color: corDaMedia(d.media).cor }}>
                          {corDaMedia(d.media).curto}
                        </Td>
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

      {perfil && <PerfilParticipantesSecao perfil={perfil} />}

      <p className="mt-8">
        <Link href={`/gestor/pesquisas/${pesquisa.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
      </p>
    </AppShell>
  );
}
