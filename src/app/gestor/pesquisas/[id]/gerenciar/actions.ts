"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import {
  alterarEncerramento,
  arquivarPesquisa,
  cancelarExclusao,
  desarquivarPesquisa,
  excluirDefinitivamente,
  excluirPesquisaNaoIniciada,
  solicitarExclusao,
} from "@/lib/gestao-pesquisas";

export type EstadoGerenciar = { erro?: string; mensagem?: string } | undefined;

/**
 * Toda action resolve a empresa pela sessão — o id da pesquisa vem do
 * formulário, mas só vale se for desta empresa (a camada de dados confere).
 */
async function empresaDoGestor() {
  const actor = await getActor();
  if (!actor) return null;
  return getWorkspaceDoGestor(actor.userId);
}

function atualizar(pesquisaId: string) {
  revalidatePath(`/gestor/pesquisas/${pesquisaId}`);
  revalidatePath(`/gestor/pesquisas/${pesquisaId}/gerenciar`);
  revalidatePath("/gestor");
}

export async function alterarEncerramentoAction(
  pesquisaId: string,
  _estado: EstadoGerenciar,
  formData: FormData,
): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const novoFim = new Date(String(formData.get("dataFim") ?? ""));
  const r = await alterarEncerramento(pesquisaId, workspace.id, novoFim);
  if (!r.ok) return { erro: r.erro };
  atualizar(pesquisaId);
  return { mensagem: "Encerramento atualizado." };
}

export async function arquivarAction(pesquisaId: string): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await arquivarPesquisa(pesquisaId, workspace.id);
  if (!r.ok) return { erro: r.erro };
  atualizar(pesquisaId);
  return { mensagem: "Pesquisa arquivada." };
}

export async function desarquivarAction(pesquisaId: string): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await desarquivarPesquisa(pesquisaId, workspace.id);
  if (!r.ok) return { erro: r.erro };
  atualizar(pesquisaId);
  return { mensagem: "Pesquisa desarquivada." };
}

/** Pesquisa que não foi iniciada: exclusão direta. */
export async function excluirDiretoAction(pesquisaId: string): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await excluirPesquisaNaoIniciada(pesquisaId, workspace.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/gestor");
  redirect("/gestor");
}

export async function solicitarExclusaoAction(
  pesquisaId: string,
  _estado: EstadoGerenciar,
  formData: FormData,
): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await solicitarExclusao(pesquisaId, workspace.id, String(formData.get("confirmacao") ?? ""));
  if (!r.ok) return { erro: r.erro };
  atualizar(pesquisaId);
  return { mensagem: "Exclusão solicitada. A pesquisa foi arquivada e não será excluída agora." };
}

export async function cancelarExclusaoAction(pesquisaId: string): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await cancelarExclusao(pesquisaId, workspace.id);
  if (!r.ok) return { erro: r.erro };
  atualizar(pesquisaId);
  return { mensagem: "Pedido de exclusão cancelado. A pesquisa continua arquivada." };
}

export async function excluirDefinitivamenteAction(
  pesquisaId: string,
  _estado: EstadoGerenciar,
  formData: FormData,
): Promise<EstadoGerenciar> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await excluirDefinitivamente(pesquisaId, workspace.id, String(formData.get("confirmacao") ?? ""));
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/gestor");
  redirect("/gestor");
}
