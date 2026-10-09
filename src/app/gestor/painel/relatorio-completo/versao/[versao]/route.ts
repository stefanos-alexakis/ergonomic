import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { lerRelatorioPdf } from "@/lib/upload";

/** Download de uma versão emitida — gestor ou consultoria DA PRÓPRIA empresa. */
export async function GET(_req: Request, { params }: { params: Promise<{ versao: string }> }) {
  const { versao } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const n = Number.parseInt(versao, 10);
  const emitido = Number.isInteger(n)
    ? await db.relatorioEmitido.findUnique({ where: { workspaceId_versao: { workspaceId: workspace.id, versao: n } } })
    : null;
  if (!emitido) return new NextResponse("Versão não encontrada.", { status: 404 });
  const pdf = await lerRelatorioPdf(emitido.arquivo);
  if (!pdf) return new NextResponse("Arquivo da versão não encontrado.", { status: 404 });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-completo-${workspace.slug}-v${emitido.versao}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
