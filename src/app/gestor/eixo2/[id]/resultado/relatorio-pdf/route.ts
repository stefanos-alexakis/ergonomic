import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { resolverAvaliacao } from "@/lib/avaliacao-eixo2";
import { carregarRelatorioEixo2, observacaoEixo2, resumoExecutivoEixo2 } from "@/lib/relatorio/eixo2-relatorio";
import { gerarRelatorioEixo2Pdf } from "@/lib/relatorio/relatorio-final-pdf";

/** Relatório do Eixo 2 em PDF (perguntas, respostas por setor e planos) — só da empresa da sessão. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });
  const avaliacao = await resolverAvaliacao(id, workspace.id);
  if (!avaliacao) return new NextResponse("Avaliação não encontrada.", { status: 404 });

  const setores = avaliacao.setores.map((s) => ({ id: s.setor.id, nome: s.setor.nome }));
  const relatorio = await carregarRelatorioEixo2(avaliacao, avaliacao.questionarioId, setores);
  const pdf = await gerarRelatorioEixo2Pdf({
    empresa: workspace.nome,
    relatorio,
    resumo: resumoExecutivoEixo2(relatorio),
    observacao: observacaoEixo2(relatorio),
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-eixo2-${avaliacao.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
