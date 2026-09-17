import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { listarCodigos } from "@/lib/licenca";
import { gerarCartoesPdf } from "@/lib/cartoes-pdf";

/**
 * @react-pdf/renderer não decodifica WebP (só PNG/JPEG) e o arquivo pode
 * não existir nesse ambiente — degrada pra cabeçalho só com texto em vez
 * de quebrar o download inteiro. Só aceita caminho que comece com
 * "/uploads/" (o único formato que salvarLogoWorkspace gera) antes de
 * concatenar no disco, contra path traversal.
 */
async function carregarLogo(logoUrl: string | null): Promise<{ buffer: Buffer; formato: "png" | "jpeg" } | null> {
  if (!logoUrl || !logoUrl.startsWith("/uploads/")) return null;
  const extensao = logoUrl.split(".").pop()?.toLowerCase();
  const formato = extensao === "png" ? "png" : extensao === "jpg" || extensao === "jpeg" ? "jpeg" : null;
  if (!formato) return null;

  try {
    const buffer = await readFile(join(process.cwd(), "public", logoUrl));
    return { buffer, formato };
  } catch {
    return null;
  }
}

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
  const logo = await carregarLogo(workspace.logoUrl);

  const pdf = await gerarCartoesPdf({
    pesquisaNome: pesquisa.nome,
    urlBase,
    cartoes: codigos.map((c) => ({ codigo: c.codigo, tipo: c.tipo })),
    workspaceNome: workspace.nome,
    dataFim: pesquisa.dataFim,
    logo: logo ?? undefined,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cartoes-${pesquisa.slug}.pdf"`,
    },
  });
}
