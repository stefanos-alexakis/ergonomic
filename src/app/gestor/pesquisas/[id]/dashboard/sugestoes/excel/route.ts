import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { gerarSugestoesExcel } from "@/lib/sugestoes-melhoria-consulta";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });
  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) return new NextResponse("Pesquisa não encontrada.", { status: 404 });

  const xlsx = await gerarSugestoesExcel(pesquisa.id, `Sugestões de melhoria — ${pesquisa.nome}`);
  if (!xlsx) return new NextResponse("Ainda não há sugestões.", { status: 409 });

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sugestoes-${pesquisa.slug}.xlsx"`,
    },
  });
}
