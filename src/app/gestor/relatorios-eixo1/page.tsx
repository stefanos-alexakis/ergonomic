import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { db } from "@/lib/db";
import { listarRelatoriosEixo1 } from "@/lib/relatorios-eixo1";
import { rotuloRespostas } from "@/lib/relatorios-eixo1-util";
import { AppShell } from "@/components/shell/app-shell";
import { GRUPOS_GESTOR, NAV_GESTOR } from "@/components/shell/nav-gestor";
import { BannerImpersonacao } from "@/components/shell/banner-impersonacao";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { BadgeStatusPesquisa } from "@/components/ui/badge-status-pesquisa";

export const dynamic = "force-dynamic";

/**
 * Atalho para os painéis (relatórios) das pesquisas do Eixo 1. Os painéis
 * continuam dentro de cada pesquisa; aqui só se lista e se aponta para eles.
 * Arquivadas e com exclusão solicitada não aparecem; pesquisa sem respostas
 * suficientes aparece, sem link ("Aguardando respostas").
 */
export default async function RelatoriosEixo1Page() {
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;
  const [usuario, linhas] = await Promise.all([
    db.user.findUnique({ where: { id: actor.userId } }),
    listarRelatoriosEixo1(workspace.id),
  ]);

  return (
    <AppShell
      contexto={workspace.nome}
      homeHref="/gestor"
      userLabel={usuario?.email}
      nav={NAV_GESTOR}
      grupos={GRUPOS_GESTOR}
      accentColor={workspace.corPrimaria}
      secondaryColor={workspace.corSecundaria}
      logoUrl={workspace.logoUrl}
      banner={actor.isPlatformAdmin ? <BannerImpersonacao workspaceNome={workspace.nome} /> : undefined}
    >
      <PageHeader eyebrow={workspace.nome} title="Relatórios Eixo 1 · Pesquisas Colaboradores" />
      <p className="mb-6 max-w-3xl text-sm text-zinc-600">
        Atalho para o painel de cada pesquisa. O painel só fica disponível quando há respostas concluídas suficientes
        para preservar o anonimato.
      </p>

      {linhas.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="lista-vazia">
          Nenhuma pesquisa para listar.
        </p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Pesquisa</Th>
              <Th>Período</Th>
              <Th>Respostas</Th>
              <Th>Status</Th>
              <Th>Relatório</Th>
            </Tr>
          </Thead>
          <tbody>
            {linhas.map((l) => (
              <Tr key={l.id} data-testid="linha-relatorio">
                <Td className="font-medium text-zinc-900">{l.nome}</Td>
                <Td className="text-zinc-500">
                  {l.dataInicio.toLocaleDateString("pt-BR")} – {l.dataFim.toLocaleDateString("pt-BR")}
                </Td>
                <Td className="tabular-nums">{rotuloRespostas(l.concluidas, l.codigos)}</Td>
                <Td>
                  <BadgeStatusPesquisa pesquisa={l} codigosGerados={l.codigos > 0} />
                </Td>
                <Td>
                  {l.painelDisponivel ? (
                    <Link
                      href={`/gestor/pesquisas/${l.id}/dashboard`}
                      className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
                      aria-label={`Abrir painel de ${l.nome}`}
                    >
                      Abrir painel
                    </Link>
                  ) : (
                    <span data-testid="aguardando-respostas" className="text-sm text-zinc-500">
                      Aguardando respostas
                    </span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </AppShell>
  );
}
