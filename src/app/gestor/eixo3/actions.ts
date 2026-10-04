"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import {
  atualizarIdentificacao,
  criarLevantamento,
  excluirLevantamento,
  importarPlanilha,
  publicarLevantamento,
  reabrirLevantamento,
  resolverSetor,
} from "@/lib/levantamento-eixo3";
import type { ProblemaPlanilha } from "@/lib/planilha-eixo3";

/**
 * Ocorrências CID-F são dado de saúde: toda action resolve a empresa pela
 * sessão (nunca por id vindo do cliente) — Server Actions são chamáveis de
 * qualquer rota, então a checagem fica em cada uma.
 */
async function sessao() {
  const actor = await getActor();
  if (!actor) return null;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  return workspace ? { actor, workspace } : null;
}

export type EstadoEixo3 =
  | { erro?: string; mensagem?: string; erros?: ProblemaPlanilha[]; avisos?: ProblemaPlanilha[] }
  | undefined;

function identificacao(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    periodoInicio: String(formData.get("periodoInicio") ?? ""),
    periodoFim: String(formData.get("periodoFim") ?? ""),
    responsavel: String(formData.get("responsavel") ?? ""),
    cargoResponsavel: String(formData.get("cargoResponsavel") ?? ""),
  };
}

export async function criarLevantamentoAction(_e: EstadoEixo3, formData: FormData): Promise<EstadoEixo3> {
  const s = await sessao();
  if (!s) return { erro: "Sem permissão." };
  const r = await criarLevantamento(s.workspace.id, identificacao(formData));
  if (!r.ok) return { erro: r.erro };
  redirect(`/gestor/eixo3/${r.id}`);
}

export async function atualizarIdentificacaoAction(id: string, _e: EstadoEixo3, formData: FormData): Promise<EstadoEixo3> {
  const s = await sessao();
  if (!s) return { erro: "Sem permissão." };
  const r = await atualizarIdentificacao(id, s.workspace.id, identificacao(formData));
  if (!r.ok) return { erro: r.erro };
  redirect(`/gestor/eixo3/${id}`);
}

export async function importarPlanilhaAction(id: string, _e: EstadoEixo3, formData: FormData): Promise<EstadoEixo3> {
  const s = await sessao();
  if (!s) return { erro: "Sem permissão." };
  const arquivo = formData.get("planilha");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Selecione a planilha (.xlsx)." };

  const r = await importarPlanilha(id, s.workspace.id, {
    nome: arquivo.name,
    buffer: Buffer.from(await arquivo.arrayBuffer()),
  });
  revalidatePath(`/gestor/eixo3/${id}`);
  if (!r.ok) return { erro: r.erro, erros: r.erros, avisos: r.avisos };
  return {
    mensagem:
      `${r.total} ocorrência(s) importada(s).` +
      (r.setoresPendentes > 0 ? ` ${r.setoresPendentes} nome(s) de setor precisam ser associados abaixo.` : ""),
    avisos: r.avisos,
  };
}

export async function resolverSetorAction(
  id: string,
  setorOriginal: string,
  acao: { tipo: "associar"; setorId: string } | { tipo: "criar" } | { tipo: "ignorar" },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const s = await sessao();
  if (!s) return { ok: false, erro: "Sem permissão." };
  const r = await resolverSetor(id, s.workspace.id, setorOriginal, acao);
  if (r.ok) {
    revalidatePath(`/gestor/eixo3/${id}`);
    revalidatePath("/gestor/estrutura");
  }
  return r;
}

export async function publicarLevantamentoAction(id: string, _e: EstadoEixo3, formData: FormData): Promise<EstadoEixo3> {
  const s = await sessao();
  if (!s) return { erro: "Sem permissão." };
  const r = await publicarLevantamento(id, s.workspace.id, s.actor.userId, {
    declaracao: formData.get("declaracao") === "on",
    responsavel: String(formData.get("responsavel") ?? ""),
    cargoResponsavel: String(formData.get("cargoResponsavel") ?? ""),
  });
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/gestor/eixo3");
  redirect(`/gestor/eixo3/${id}`);
}

export async function reabrirLevantamentoAction(id: string): Promise<void> {
  const s = await sessao();
  if (!s) return;
  await reabrirLevantamento(id, s.workspace.id);
  revalidatePath("/gestor/eixo3");
  redirect(`/gestor/eixo3/${id}`);
}

export async function excluirLevantamentoAction(id: string): Promise<void> {
  const s = await sessao();
  if (!s) return;
  await excluirLevantamento(id, s.workspace.id);
  revalidatePath("/gestor/eixo3");
  redirect("/gestor/eixo3");
}
