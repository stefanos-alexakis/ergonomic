"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import { adicionarItemCatalogo } from "@/lib/estrutura";
import {
  concluirAvaliacao,
  criarAvaliacao,
  definirSetores,
  excluirAvaliacao,
  reabrirAvaliacao,
  salvarFechamento,
  salvarResposta,
} from "@/lib/avaliacao-eixo2";

/**
 * Toda action aqui resolve a empresa pela sessão — nunca confia em
 * workspaceId vindo do cliente. Server Actions são chamáveis de qualquer
 * rota (header Next-Action), então a checagem tem que estar em cada uma,
 * não só no middleware (lição da falha dos pesos, out/2026).
 */
async function empresaDoGestor() {
  const actor = await getActor();
  if (!actor) return null;
  return getWorkspaceDoGestor(actor.userId);
}

export type EstadoEixo2 = { erro?: string; mensagem?: string } | undefined;

export async function criarAvaliacaoAction(_estado: EstadoEixo2, formData: FormData): Promise<EstadoEixo2> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };

  const r = await criarAvaliacao(workspace.id, {
    nome: String(formData.get("nome") ?? ""),
    participantes: String(formData.get("participantes") ?? ""),
    setorIds: formData.getAll("setorId").map(String),
  });
  if (!r.ok) return { erro: r.erro };
  redirect(`/gestor/eixo2/${r.id}`);
}

/** "+ Novo setor" dentro do fluxo do Eixo 2 — cadastra no catálogo da empresa. */
export async function criarSetorRapidoAction(
  nome: string,
): Promise<{ ok: true; setor: { id: string; nome: string } } | { ok: false; erro: string }> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { ok: false, erro: "Sem permissão." };
  const limpo = nome.trim();
  if (limpo.length < 2) return { ok: false, erro: "Nome do setor muito curto." };
  if (limpo.length > 120) return { ok: false, erro: "Nome do setor muito longo." };
  const setor = await adicionarItemCatalogo(workspace.id, "setor", limpo);
  revalidatePath("/gestor/estrutura");
  return { ok: true, setor: { id: setor.id, nome: setor.nome } };
}

export async function definirSetoresAction(
  avaliacaoId: string,
  _estado: EstadoEixo2,
  formData: FormData,
): Promise<EstadoEixo2> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await definirSetores(avaliacaoId, workspace.id, formData.getAll("setorId").map(String));
  if (!r.ok) return { erro: r.erro };
  redirect(`/gestor/eixo2/${avaliacaoId}`);
}

export async function salvarRespostaEixo2Action(
  avaliacaoId: string,
  input: {
    questaoId: string;
    setorIds: string[];
    condicao?: string;
    planoAcao?: string | null;
    justificativa?: string | null;
  },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { ok: false, erro: "Sem permissão." };
  return salvarResposta(avaliacaoId, workspace.id, input);
}

export async function salvarFechamentoAction(
  avaliacaoId: string,
  _estado: EstadoEixo2,
  formData: FormData,
): Promise<EstadoEixo2> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };

  const descricoes = formData.getAll("pratica_descricao").map(String);
  const frequencias = formData.getAll("pratica_frequencia").map(String);
  const evidencias = formData.getAll("pratica_evidencia").map(String);
  const r = await salvarFechamento(avaliacaoId, workspace.id, {
    participantes: String(formData.get("participantes") ?? ""),
    responsavel: String(formData.get("responsavel") ?? ""),
    observacaoFinal: String(formData.get("observacaoFinal") ?? ""),
    praticas: descricoes.map((descricao, i) => ({
      descricao,
      frequencia: frequencias[i] ?? "",
      evidencia: evidencias[i] ?? "",
    })),
  });
  if (!r.ok) return { erro: r.erro };

  if (formData.get("intencao") === "concluir") {
    const c = await concluirAvaliacao(avaliacaoId, workspace.id);
    if (!c.ok) return { erro: c.erro };
    revalidatePath("/gestor/eixo2");
    redirect(`/gestor/eixo2/${avaliacaoId}/resultado`);
  }
  revalidatePath(`/gestor/eixo2/${avaliacaoId}/concluir`);
  return { mensagem: "Salvo." };
}

/**
 * Concluir direto de qualquer etapa (sugestão do usuário: ao reabrir uma
 * avaliação para corrigir uma resposta, não faz sentido percorrer as 13
 * etapas até o fim). Os dados de fechamento já gravados são mantidos; a
 * regra de "tudo respondido" continua valendo em concluirAvaliacao.
 */
export async function concluirAvaliacaoAction(avaliacaoId: string): Promise<EstadoEixo2> {
  const workspace = await empresaDoGestor();
  if (!workspace) return { erro: "Sem permissão." };
  const r = await concluirAvaliacao(avaliacaoId, workspace.id);
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/gestor/eixo2");
  redirect(`/gestor/eixo2/${avaliacaoId}/resultado`);
}

export async function reabrirAvaliacaoAction(avaliacaoId: string): Promise<void> {
  const workspace = await empresaDoGestor();
  if (!workspace) return;
  const r = await reabrirAvaliacao(avaliacaoId, workspace.id);
  if (!r.ok) return;
  revalidatePath("/gestor/eixo2");
  redirect(`/gestor/eixo2/${avaliacaoId}`);
}

export async function excluirAvaliacaoAction(avaliacaoId: string): Promise<void> {
  const workspace = await empresaDoGestor();
  if (!workspace) return;
  await excluirAvaliacao(avaliacaoId, workspace.id);
  revalidatePath("/gestor/eixo2");
  redirect("/gestor/eixo2");
}
