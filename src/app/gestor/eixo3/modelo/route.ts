import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { gerarPlanilhaModeloEixo3 } from "@/lib/planilha-modelo-eixo3";

export async function GET() {
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  return new NextResponse(new Uint8Array(await gerarPlanilhaModeloEixo3()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modelo-ocorrencias-eixo3.xlsx"',
    },
  });
}
