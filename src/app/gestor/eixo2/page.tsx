import Link from "next/link";
import { listarAvaliacoes } from "@/lib/avaliacao-eixo2";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { contextoGestor } from "./contexto";

export const dynamic = "force-dynamic";

export default async function Eixo2Page() {
  const { actor, workspace } = await contextoGestor();
  const avaliacoes = await listarAvaliacoes(workspace.id);

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader
        eyebrow="Eixo 2"
        title="Medidas de controle"
        actions={
          <Link href="/gestor/eixo2/nova">
            <Button>+ Nova avaliação</Button>
          </Link>
        }
      />
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        A empresa (liderança, RH ou grupo focal) informa, para cada setor, se existem medidas de
        controle para os fatores de risco que os colaboradores avaliam no Eixo 1. Uma avaliação
        cobre os setores escolhidos; respostas iguais podem ser dadas de uma vez para todos.
      </p>

      {avaliacoes.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma avaliação criada ainda.</p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Avaliação</Th>
              <Th>Setores</Th>
              <Th>Progresso</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <tbody>
            {avaliacoes.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <Link
                    href={a.status === "CONCLUIDA" ? `/gestor/eixo2/${a.id}/resultado` : `/gestor/eixo2/${a.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {a.nome}
                  </Link>
                  <div className="text-xs text-zinc-400">criada em {a.createdAt.toLocaleDateString("pt-BR")}</div>
                </Td>
                <Td>{a._count.setores}</Td>
                <Td className="text-zinc-600">
                  {a.progresso.completas} de {a.progresso.total} perguntas
                </Td>
                <Td>
                  <Badge tom={a.status === "CONCLUIDA" ? "sucesso" : "atencao"}>
                    {a.status === "CONCLUIDA" ? "Concluída" : "Em preenchimento"}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </ShellGestor>
  );
}
