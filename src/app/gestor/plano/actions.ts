"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import {
  TRANSICOES,
  atualizarAcao,
  atualizarAndamento,
  autorDe,
  criarAcao,
  gerarDoEixo2,
  lerDadosAcao,
  mudarFase,
  questaoDaSituacao,
  verificarAcao,
  type Autor,
} from "@/lib/plano-acao";
import { semCrlf, type Eficacia, type Fase } from "@/lib/plano-acao-util";

export type EstadoForm = { erro?: string; sucesso?: string } | undefined;

/**
 * Toda action resolve empresa + autor pela sessão (gestor, ou admin da
 * plataforma na visão de gestor = consultoria). Nunca confia em
 * workspaceId vindo do navegador; ação de outra empresa = "não encontrada".
 */
async function contexto(): Promise<{ workspaceId: string; autor: Autor } | null> {
  const actor = await getActor();
  if (!actor) return null;
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return null;
  return { workspaceId: workspace.id, autor: await autorDe(actor) };
}

const SEM_ACESSO = { erro: "Sessão expirada ou sem acesso. Entre novamente." };

function revalidar(id?: string) {
  revalidatePath("/gestor/plano");
  if (id) revalidatePath(`/gestor/plano/${id}`);
  revalidatePath("/gestor/painel");
}

export async function gerarDoEixo2Action(_e: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await contexto();
  if (!ctx) return SEM_ACESSO;
  const avaliacaoId = String(fd.get("avaliacaoId") ?? "");
  if (!avaliacaoId) return { erro: "Escolha a avaliação do Eixo 2." };
  const r = await gerarDoEixo2(ctx.workspaceId, avaliacaoId, ctx.autor);
  if (!r.ok) return { erro: r.erro };
  revalidar();
  if (r.criadas === 0 && r.atualizadas === 0) {
    return { sucesso: "Nada novo: todos os planos dessa avaliação já estão no plano de ação." };
  }
  return { sucesso: `${r.criadas} ação(ões) criada(s) e ${r.atualizadas} atualizada(s) com novos setores.` };
}

export async function criarAcaoAction(_e: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await contexto();
  if (!ctx) return SEM_ACESSO;
  const dados = lerDadosAcao(fd);
  if ("erro" in dados) return dados;
  // Vinda de uma situação do PGR: liga a ação à questão do Eixo 2 dela,
  // para o painel reconhecer que a situação está coberta.
  const questaoEixo2Id = await questaoDaSituacao(String(fd.get("questaoEixo2Id") ?? ""), dados.dimensaoId);
  const r = await criarAcao(ctx.workspaceId, dados, ctx.autor, questaoEixo2Id ? { questaoEixo2Id } : {});
  if (!r.ok) return { erro: r.erro };
  revalidar();
  redirect(`/gestor/plano/${r.id}`);
}

export async function salvarAcaoAction(id: string, _e: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await contexto();
  if (!ctx) return SEM_ACESSO;
  const dados = lerDadosAcao(fd);
  if ("erro" in dados) return dados;
  const r = await atualizarAcao(id, ctx.workspaceId, String(fd.get("versao") ?? ""), dados, ctx.autor);
  if (!r.ok) return { erro: r.erro };
  revalidar(id);
  return { sucesso: "Ação salva." };
}

export async function mudarFaseAction(id: string, _e: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await contexto();
  if (!ctx) return SEM_ACESSO;
  const nova = String(fd.get("fase") ?? "") as Fase;
  if (!(nova in TRANSICOES)) return { erro: "Fase inválida." };
  const r = await mudarFase(id, ctx.workspaceId, String(fd.get("versao") ?? ""), nova, ctx.autor);
  if (!r.ok) return { erro: r.erro };
  revalidar(id);
  return { sucesso: "Fase atualizada." };
}

export async function andamentoAction(id: string, _e: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await contexto();
  if (!ctx) return SEM_ACESSO;
  const r = await atualizarAndamento(
    id,
    ctx.workspaceId,
    String(fd.get("versao") ?? ""),
    Number(fd.get("percentual")),
    semCrlf(String(fd.get("nota") ?? "")),
    ctx.autor,
  );
  if (!r.ok) return { erro: r.erro };
  revalidar(id);
  return { sucesso: "Andamento registrado." };
}

export async function verificarAction(id: string, _e: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ctx = await contexto();
  if (!ctx) return SEM_ACESSO;
  const r = await verificarAcao(
    id,
    ctx.workspaceId,
    String(fd.get("versao") ?? ""),
    {
      eficacia: String(fd.get("eficacia") ?? "") as Eficacia,
      verificacao: semCrlf(String(fd.get("verificacao") ?? "")),
      criarCorretiva: fd.get("corretiva") === "on",
    },
    ctx.autor,
  );
  if (!r.ok) return { erro: r.erro };
  revalidar(id);
  if (r.corretivaId) redirect(`/gestor/plano/${r.corretivaId}`);
  return { sucesso: "Verificação registrada." };
}
