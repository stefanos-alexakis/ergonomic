import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { gerarPlanilhaModelo } from "@/lib/planilha-modelo";

export async function GET() {
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });

  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const planilha = await gerarPlanilhaModelo();

  return new NextResponse(planilha, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-setores-departamentos.xlsx"',
    },
  });
}
