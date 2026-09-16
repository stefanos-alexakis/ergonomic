import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { calcularDashboard } from "@/lib/dashboard";
import { gerarRelatorioPdf } from "@/lib/relatorio-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });

  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) return new NextResponse("Pesquisa não encontrada.", { status: 404 });

  const dashboard = await calcularDashboard(pesquisa.id);
  const pdf = await gerarRelatorioPdf({
    pesquisaNome: pesquisa.nome,
    workspaceNome: workspace.nome,
    dashboard,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${pesquisa.slug}.pdf"`,
    },
  });
}
