import { notFound } from "next/navigation";
import Link from "next/link";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { listarCodigos } from "@/lib/licenca";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GerarLicencasButton } from "./gerar-licencas-button";

export const dynamic = "force-dynamic";

const NAV = [{ href: "/gestor/estrutura", label: "Setores e departamentos" }];

export default async function PesquisaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return <p>Sem sessão.</p>;

  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return <p>Usuário sem empresa vinculada.</p>;

  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) notFound();

  const codigos = await listarCodigos(pesquisa.id);
  const participantes = codigos.filter((c) => c.tipo === "PARTICIPANTE");
  const teste = codigos.filter((c) => c.tipo === "TESTE");

  return (
    <AppShell contexto={workspace.nome} homeHref="/gestor" nav={NAV} accentColor={workspace.corPrimaria} secondaryColor={workspace.corSecundaria}>
      <PageHeader
        eyebrow={
          <>
            {pesquisa.dataInicio.toLocaleString("pt-BR")} até {pesquisa.dataFim.toLocaleString("pt-BR")}
          </>
        }
        title={pesquisa.nome}
        actions={<Badge>{pesquisa.status}</Badge>}
      />

      {codigos.length === 0 ? (
        <GerarLicencasButton pesquisaId={pesquisa.id} />
      ) : (
        <>
          <div className="flex items-center gap-6 mb-6">
            <div>
              <span className="text-2xl font-semibold text-zinc-900">{participantes.length}</span>
              <span className="text-sm text-zinc-500 ml-2">códigos de participante</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-zinc-900">{teste.length}</span>
              <span className="text-sm text-zinc-500 ml-2">códigos de teste</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6 text-sm">
            <a href={`/gestor/pesquisas/${pesquisa.id}/cartoes`} className="text-zinc-900 font-medium hover:underline">
              Baixar cartões em PDF (com QR code)
            </a>
            <span className="text-zinc-300">·</span>
            <Link href={`/gestor/pesquisas/${pesquisa.id}/dashboard`} className="text-zinc-900 font-medium hover:underline">
              Ver painel
            </Link>
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th>Código</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <tbody>
              {codigos.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <code className="text-sm">{c.codigo}</code>
                  </Td>
                  <Td>
                    <Badge>{c.tipo}</Badge>
                  </Td>
                  <Td>
                    <Badge>{c.status}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </AppShell>
  );
}
