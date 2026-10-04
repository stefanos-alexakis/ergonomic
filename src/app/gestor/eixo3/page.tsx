import Link from "next/link";
import { listarLevantamentos } from "@/lib/levantamento-eixo3";
import { ShellGestor } from "@/components/shell/shell-gestor";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/table";
import { contextoGestor } from "../eixo2/contexto";

export const dynamic = "force-dynamic";

const data = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

export default async function Eixo3Page() {
  const { actor, workspace } = await contextoGestor();
  const levantamentos = await listarLevantamentos(workspace.id);

  return (
    <ShellGestor workspace={workspace} isPlatformAdmin={actor.isPlatformAdmin}>
      <PageHeader
        eyebrow="Eixo 3"
        title="Atestados e afastamentos CID-F"
        actions={
          <>
            <a href="/gestor/eixo3/modelo">
              <Button variant="secondary">Baixar modelo da planilha</Button>
            </a>
            <Link href="/gestor/eixo3/novo">
              <Button>+ Publicar planilha</Button>
            </Link>
          </>
        }
      />
      <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
        O RH/DP publica a planilha com as ocorrências CID-F do período, uma linha por ocorrência, sem
        identificar o colaborador. Ocorrências <strong>relacionadas ao trabalho</strong> agravam (×1,10)
        os fatores de risco do setor compatíveis com o CID, conforme a matriz Fatores × CID F. Um CID
        não comprova, sozinho, nexo causal — é indicador coletivo do setor.
      </p>

      {levantamentos.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma planilha publicada ainda.</p>
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Levantamento</Th>
              <Th>Período</Th>
              <Th>Ocorrências</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <tbody>
            {levantamentos.map((l) => (
              <Tr key={l.id}>
                <Td>
                  <Link href={`/gestor/eixo3/${l.id}`} className="font-medium text-zinc-900 hover:underline">
                    {l.nome}
                  </Link>
                  {l.responsavel && <div className="text-xs text-zinc-400">Responsável: {l.responsavel}</div>}
                </Td>
                <Td className="text-zinc-600">
                  {data(l.periodoInicio)} – {data(l.periodoFim)}
                </Td>
                <Td>{l._count.ocorrencias}</Td>
                <Td>
                  <Badge tom={l.status === "PUBLICADO" ? "sucesso" : "atencao"}>
                    {l.status === "PUBLICADO" ? "Publicado" : "Rascunho"}
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
