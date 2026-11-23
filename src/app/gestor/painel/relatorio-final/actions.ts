"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { db } from "@/lib/db";
import { carregarRascunho, lerRascunho, salvarRascunho } from "@/lib/relatorio/relatorio-completo";
import {
  emitirRelatorioFinal,
  lerTextosFinal,
  montarDadosRelatorioFinal,
  salvarTextosFinal,
} from "@/lib/relatorio/relatorio-final";
import { gerarRelatorioFinalPdf } from "@/lib/relatorio/relatorio-final-pdf";

export type EstadoRelatorioFinal = { erro?: string; sucesso?: string } | undefined;

/**
 * Só a consultoria (admin da plataforma na visão de gestor) redige e emite o
 * relatório final; o gestor só baixa as versões emitidas. Empresa sempre da sessão.
 */
async function consultoria() {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return null;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  return workspace ? { actor, workspace } : null;
}

/**
 * Salva fontes, conclusão e textos. Fontes e conclusão são as mesmas do
 * relatório completo (um rascunho por empresa); quem assina o completo não muda.
 */
async function salvar(workspace: { id: string; nome: string; logoUrl: string | null }, fd: FormData): Promise<string | null> {
  const lido = await lerRascunho(workspace.id, fd);
  if (!lido.ok) return lido.erro;
  const atual = await carregarRascunho(workspace.id);
  const rascunho = { ...lido.rascunho, consultorIds: atual.consultorIds };
  await salvarRascunho(workspace.id, rascunho);
  // Os padrões dependem das fontes que acabaram de ser salvas.
  const base = await montarDadosRelatorioFinal(
    workspace,
    rascunho,
    { cruzamentoAnalitico: null, resumoEixo2: null, observacaoEixo2: null, fontesInternas: null },
    null,
  );
  if (!base) return "Nenhum questionário ativo.";
  const textos = lerTextosFinal(fd, base.padroes);
  if (!textos.ok) return textos.erro;
  await salvarTextosFinal(workspace.id, textos.textos);
  return null;
}

export async function salvarRelatorioFinalAction(_e: EstadoRelatorioFinal, fd: FormData): Promise<EstadoRelatorioFinal> {
  const ctx = await consultoria();
  if (!ctx) return { erro: "Só a consultoria pode editar o relatório final." };
  const erro = await salvar(ctx.workspace, fd);
  if (erro) return { erro };
  revalidatePath("/gestor/painel/relatorio-final");
  return { sucesso: "Rascunho salvo." };
}

export async function emitirRelatorioFinalAction(_e: EstadoRelatorioFinal, fd: FormData): Promise<EstadoRelatorioFinal> {
  const ctx = await consultoria();
  if (!ctx) return { erro: "Só a consultoria pode emitir o relatório final." };
  const erro = await salvar(ctx.workspace, fd);
  if (erro) return { erro };
  const usuario = await db.user.findUnique({ where: { id: ctx.actor.userId }, select: { nome: true } });
  const r = await emitirRelatorioFinal(
    ctx.workspace,
    { userId: ctx.actor.userId, nome: `${usuario?.nome ?? "Consultoria"} (consultoria)` },
    gerarRelatorioFinalPdf,
  );
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/gestor/painel/relatorio-final");
  return { sucesso: `Versão ${r.versao} emitida.` };
}
