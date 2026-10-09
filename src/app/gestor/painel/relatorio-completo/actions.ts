"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { db } from "@/lib/db";
import { emitirRelatorio, lerRascunho, salvarRascunho } from "@/lib/relatorio/relatorio-completo";

export type EstadoRelatorio = { erro?: string; sucesso?: string } | undefined;

/**
 * Só a consultoria (admin da plataforma na visão de gestor) redige e emite
 * o relatório completo; o gestor da empresa só baixa as versões emitidas.
 * A empresa sempre vem da sessão, nunca do formulário.
 */
async function consultoria() {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return null;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  return workspace ? { actor, workspace } : null;
}

export async function salvarRascunhoAction(_e: EstadoRelatorio, fd: FormData): Promise<EstadoRelatorio> {
  const ctx = await consultoria();
  if (!ctx) return { erro: "Só a consultoria pode editar o relatório completo." };
  const lido = await lerRascunho(ctx.workspace.id, fd);
  if (!lido.ok) return { erro: lido.erro };
  await salvarRascunho(ctx.workspace.id, lido.rascunho);
  revalidatePath("/gestor/painel/relatorio-completo");
  return { sucesso: "Rascunho salvo." };
}

/** Salva o que está na tela e emite a próxima versão. */
export async function emitirRelatorioAction(_e: EstadoRelatorio, fd: FormData): Promise<EstadoRelatorio> {
  const ctx = await consultoria();
  if (!ctx) return { erro: "Só a consultoria pode emitir o relatório completo." };
  const lido = await lerRascunho(ctx.workspace.id, fd);
  if (!lido.ok) return { erro: lido.erro };
  await salvarRascunho(ctx.workspace.id, lido.rascunho);
  const usuario = await db.user.findUnique({ where: { id: ctx.actor.userId }, select: { nome: true } });
  const r = await emitirRelatorio(ctx.workspace, { userId: ctx.actor.userId, nome: `${usuario?.nome ?? "Consultoria"} (consultoria)` });
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/gestor/painel/relatorio-completo");
  return { sucesso: `Versão ${r.versao} emitida.` };
}
