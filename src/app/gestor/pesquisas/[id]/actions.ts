"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lerOrientacao, valoresDigitados } from "@/lib/orientacao";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, resolvePesquisaDoWorkspace } from "@/lib/pesquisa";
import { gerarLicencas } from "@/lib/licenca";

export type EstadoGerarLicencas = { erro?: string; mensagem?: string } | undefined;

export async function gerarLicencasAction(
  _estadoAnterior: EstadoGerarLicencas,
  formData: FormData,
): Promise<EstadoGerarLicencas> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };

  const pesquisaId = String(formData.get("pesquisaId") ?? "");
  const pesquisa = await resolvePesquisaDoWorkspace(pesquisaId, workspace.id);
  if (!pesquisa) return { erro: "Pesquisa não encontrada." };

  const resultado = await gerarLicencas(pesquisa.id);
  if (!resultado.ok) return { erro: resultado.erro };

  revalidatePath(`/gestor/pesquisas/${pesquisa.id}`);
  return {
    mensagem: `${resultado.participantes} códigos de participante + ${resultado.teste} de teste gerados.`,
  };
}

export type EstadoEditarOrientacao = { erro?: string; valores?: Record<string, string> } | undefined;

/**
 * Edita só a orientação (vídeo/texto) e a pré-pesquisa — nome, datas e
 * licenças não mudam aqui (o nome já virou a URL impressa nos cartões).
 */
export async function editarOrientacaoAction(
  pesquisaId: string,
  _estadoAnterior: EstadoEditarOrientacao,
  formData: FormData,
): Promise<EstadoEditarOrientacao> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };
  const pesquisa = await resolvePesquisaDoWorkspace(pesquisaId, workspace.id);
  if (!pesquisa) return { erro: "Pesquisa não encontrada." };

  const orientacao = lerOrientacao(formData);
  if (!orientacao.ok) {
    return { erro: orientacao.erro, valores: valoresDigitados(formData, ["videoYoutube", "textoOrientacao", "exibirPrePesquisa"]) };
  }

  await db.pesquisa.update({ where: { id: pesquisa.id }, data: orientacao.dados });
  revalidatePath(`/gestor/pesquisas/${pesquisa.id}`);
  redirect(`/gestor/pesquisas/${pesquisa.id}`);
}
