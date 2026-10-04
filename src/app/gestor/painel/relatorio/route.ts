import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { calcularPainelFrprt } from "@/lib/painel-frprt";
import { gerarRelatorioFrprtPdf } from "@/lib/relatorio-frprt-pdf";

export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const p = new URL(req.url).searchParams;
  const painel = await calcularPainelFrprt(
    workspace.id,
    {
      pesquisaId: p.get("pesquisa") ?? undefined,
      avaliacaoId: p.get("avaliacao") ?? undefined,
      levantamentoId: p.get("levantamento") ?? undefined,
    },
    { setorId: p.get("setor") || undefined, departamentoId: p.get("departamento") || undefined },
  );
  if (!painel) return new NextResponse("Nenhum questionário ativo.", { status: 404 });

  const pdf = await gerarRelatorioFrprtPdf({ workspaceNome: workspace.nome, painel });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-frprt-${workspace.slug}.pdf"`,
    },
  });
}
