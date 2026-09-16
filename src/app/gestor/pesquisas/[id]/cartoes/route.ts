import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { listarCodigos } from "@/lib/licenca";
import { gerarCartoesPdf } from "@/lib/cartoes-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });

  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const pesquisa = await resolvePesquisaDoWorkspace(id, workspace.id);
  if (!pesquisa) return new NextResponse("Pesquisa não encontrada.", { status: 404 });

  const codigos = await listarCodigos(pesquisa.id);
  if (codigos.length === 0) {
    return new NextResponse("Nenhum código gerado ainda para esta pesquisa.", { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const urlBase = `${appUrl}/p/${workspace.slug}/${pesquisa.slug}`;

  const pdf = await gerarCartoesPdf({
    pesquisaNome: pesquisa.nome,
    urlBase,
    cartoes: codigos.map((c) => ({ codigo: c.codigo, tipo: c.tipo })),
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cartoes-${pesquisa.slug}.pdf"`,
    },
  });
}
