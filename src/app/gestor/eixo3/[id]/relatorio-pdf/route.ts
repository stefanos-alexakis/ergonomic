import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { calcularPainelEixo3, resolverLevantamento } from "@/lib/levantamento-eixo3";
import { gerarRelatorioEixo3Pdf } from "@/lib/relatorio/relatorio-final-pdf";

/**
 * Relatório do Eixo 3 em PDF: painéis de atestados por ano (CID F, Z e outros)
 * e indicadores por setor. Sem matrícula nem lista individual — só agregados.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });
  const l = await resolverLevantamento(id, workspace.id);
  if (!l || l.status !== "PUBLICADO") return new NextResponse("Levantamento publicado não encontrado.", { status: 404 });

  const [eixo3, totalFatores] = await Promise.all([
    calcularPainelEixo3(l.id, workspace.id),
    db.dimensao.count({ where: { bloco: { questionario: { ativo: true } } } }),
  ]);
  const pdf = await gerarRelatorioEixo3Pdf({ empresa: workspace.nome, levantamento: l, eixo3, totalFatores });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-eixo3-${l.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
