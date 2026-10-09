import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { gerarDistribuicaoExcel } from "@/lib/distribuicao-excel";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) return new NextResponse("Pesquisa não encontrada.", { status: 404 });

  const xlsx = await gerarDistribuicaoExcel(pesquisa.id, `Distribuição das respostas — ${pesquisa.nome}`);
  if (!xlsx) return new NextResponse("Respostas insuficientes para exibir com segurança.", { status: 409 });

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="distribuicao-${pesquisa.slug}.xlsx"`,
    },
  });
}
