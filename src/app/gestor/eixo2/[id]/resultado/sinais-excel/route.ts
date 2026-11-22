import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { resolverAvaliacao } from "@/lib/avaliacao-eixo2";
import { gerarSinaisExcel } from "@/lib/sinais-eixo2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });
  const avaliacao = await resolverAvaliacao(id, workspace.id);
  if (!avaliacao) return new NextResponse("Avaliação não encontrada.", { status: 404 });

  const setores = avaliacao.setores.map((s) => ({ id: s.setor.id, nome: s.setor.nome }));
  const xlsx = await gerarSinaisExcel(avaliacao.id, setores, `Sinais de exposição (ISO 45003) — ${avaliacao.nome}`);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sinais-iso45003-${avaliacao.id}.xlsx"`,
    },
  });
}
