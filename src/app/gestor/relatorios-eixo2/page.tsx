import Link from "next/link";
import { listarAvaliacoes } from "@/lib/avaliacao-eixo2";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { contextoGestor } from "../eixo2/contexto";

export const dynamic = "force-dynamic";

const data = (d: Date) => d.toLocaleDateString("pt-BR");

/**
 * Atalho para os resultados e as respostas das avaliações do Eixo 2. As
 * avaliações continuam em /gestor/eixo2; aqui só se lista e se aponta para elas.
 */
export default async function RelatoriosEixo2Page() {
  const { actor, workspace } = await contextoGestor();
  const avaliacoes = await listarAvaliacoes(workspace.id);

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader eyebrow={workspace.nome} title="Relatórios Eixo 2 · Medidas de controle" />
      <p className="mb-6 max-w-3xl text-sm text-zinc-600">
        Atalho para o resultado e as respostas de cada avaliação do Eixo 2. Para entender como o score é calculado,
        leia{" "}
        <Link href="/gestor/eixo2/como-funciona" className="underline underline-offset-2 hover:no-underline">
          Como funciona o score do Eixo 2
        </Link>
        .
      </p>

      {avaliacoes.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="lista-vazia">
          Nenhuma avaliação para listar.
        </p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Avaliação</Th>
              <Th>Data</Th>
              <Th>Setores</Th>
              <Th>Status</Th>
              <Th>Resultado</Th>
              <Th>Respostas</Th>
            </Tr>
          </Thead>
          <tbody>
            {avaliacoes.map((a) => {
              const concluida = a.status === "CONCLUIDA";
              return (
                <Tr key={a.id} data-testid="linha-relatorio">
                  <Td className="font-medium text-zinc-900">{a.nome}</Td>
                  <Td className="text-zinc-500">
                    {concluida && a.concluidaEm ? `Concluída em ${data(a.concluidaEm)}` : `Criada em ${data(a.createdAt)}`}
                  </Td>
                  <Td className="tabular-nums">{a._count.setores}</Td>
                  <Td>
                    <Badge tom={concluida ? "sucesso" : "atencao"}>{concluida ? "Concluída" : "Em preenchimento"}</Badge>
                  </Td>
                  <Td>
                    <Link
                      href={`/gestor/eixo2/${a.id}/resultado`}
                      className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
                      aria-label={`${concluida ? "Ver resultado" : "Ver resultado parcial"} de ${a.nome}`}
                    >
                      {concluida ? "Ver resultado" : "Resultado parcial"}
                    </Link>
                  </Td>
                  <Td>
                    <Link
                      href={`/gestor/eixo2/${a.id}`}
                      className="font-medium text-zinc-900 underline underline-offset-2 hover:no-underline"
                      aria-label={`${concluida ? "Ver respostas" : "Continuar preenchendo"} de ${a.nome}`}
                    >
                      {concluida ? "Ver respostas" : "Continuar preenchendo"}
                    </Link>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </ShellGestor>
  );
}
