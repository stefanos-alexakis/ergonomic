import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { carregarRascunho } from "@/lib/relatorio/relatorio-completo";
import { carregarTextosFinal, montarDadosRelatorioFinal } from "@/lib/relatorio/relatorio-final";
import { gerarRelatorioFinalPdf } from "@/lib/relatorio/relatorio-final-pdf";

/** Pré-visualização do relatório final com o rascunho salvo — só a consultoria; nada é gravado. */
export async function GET() {
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  if (!actor.isPlatformAdmin) return new NextResponse("Só a consultoria pré-visualiza o relatório.", { status: 403 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const [rascunho, textos] = await Promise.all([carregarRascunho(workspace.id), carregarTextosFinal(workspace.id)]);
  const dados = await montarDadosRelatorioFinal(workspace, rascunho, textos, null);
  if (!dados) return new NextResponse("Nenhum questionário ativo.", { status: 404 });
  const pdf = await gerarRelatorioFinalPdf(dados);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-final-previa-${workspace.slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
