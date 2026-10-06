import { NextResponse } from "next/server";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { listarAcoes } from "@/lib/plano-acao";
import { hojeIso } from "@/lib/plano-acao-util";
import { gerarPlanoExcel, gerarPlanoPdf } from "@/lib/plano-acao-export";
import { filtrar } from "../filtros";

/** Exporta o plano (com os mesmos filtros da tela) em Excel ou PDF. */
export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) return new NextResponse("Não autenticado.", { status: 401 });
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return new NextResponse("Sem empresa vinculada.", { status: 403 });

  const p = new URL(req.url).searchParams;
  const hoje = hojeIso();
  const acoes = filtrar(
    await listarAcoes(workspace.id),
    {
      setor: p.get("setor") ?? undefined,
      fator: p.get("fator") ?? undefined,
      fase: p.get("fase") ?? undefined,
      situacao: p.get("situacao") ?? undefined,
      prioridade: p.get("prioridade") ?? undefined,
      q: p.get("q") ?? undefined,
    },
    hoje,
  );

  if (p.get("formato") === "pdf") {
    const pdf = await gerarPlanoPdf(acoes, workspace.nome, hoje);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="plano-de-acao-${workspace.slug}.pdf"`,
      },
    });
  }
  const xlsx = await gerarPlanoExcel(acoes, workspace.nome, hoje);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plano-de-acao-${workspace.slug}.xlsx"`,
    },
  });
}
