"use server";

import { revalidatePath } from "next/cache";
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
