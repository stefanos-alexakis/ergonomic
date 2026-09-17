"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor } from "@/lib/pesquisa";
import {
  adicionarItemCatalogo,
  importarPlanilhaEstrutura,
  removerItemCatalogo,
  renomearItemCatalogo,
  type TipoCatalogo,
} from "@/lib/estrutura";

export type EstadoEstrutura = { erro?: string; mensagem?: string } | undefined;

const TIPOS = ["setor", "departamento"] as const;

function tipoValido(tipo: string): tipo is TipoCatalogo {
  return (TIPOS as readonly string[]).includes(tipo);
}

export async function adicionarItemAction(
  _estadoAnterior: EstadoEstrutura,
  formData: FormData,
): Promise<EstadoEstrutura> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };

  const tipo = String(formData.get("tipo") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!tipoValido(tipo)) return { erro: "Tipo inválido." };
  if (!nome) return { erro: "Nome não pode ser vazio." };

  await adicionarItemCatalogo(workspace.id, tipo, nome);
  revalidatePath("/gestor/estrutura");
  return { mensagem: "Adicionado." };
}

export async function renomearItemAction(
  tipo: TipoCatalogo,
  id: string,
  _estadoAnterior: EstadoEstrutura,
  formData: FormData,
): Promise<EstadoEstrutura> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };

  const novoNome = String(formData.get("nome") ?? "");
  const resultado = await renomearItemCatalogo(workspace.id, tipo, id, novoNome);
  if (!resultado.ok) return { erro: resultado.erro };

  revalidatePath("/gestor/estrutura");
  return { mensagem: "Renomeado." };
}

export async function removerItemAction(
  tipo: TipoCatalogo,
  id: string,
): Promise<EstadoEstrutura> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };

  const resultado = await removerItemCatalogo(workspace.id, tipo, id);
  if (!resultado.ok) return { erro: resultado.erro };

  revalidatePath("/gestor/estrutura");
  return { mensagem: "Removido." };
}

export async function importarPlanilhaAction(
  _estadoAnterior: EstadoEstrutura,
  formData: FormData,
): Promise<EstadoEstrutura> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };
  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };

  const arquivo = formData.get("planilha");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione um arquivo .xlsx." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const relatorio = await importarPlanilhaEstrutura(workspace.id, buffer);

  revalidatePath("/gestor/estrutura");

  const totalCriados = Object.values(relatorio.criados).reduce((a, b) => a + b, 0);
  if (relatorio.erros.length > 0) {
    return {
      erro: `${totalCriados} itens importados, mas ${relatorio.erros.length} linha(s) com problema: ${relatorio.erros
        .slice(0, 3)
        .map((e) => `linha ${e.linha} (${e.coluna})`)
        .join(", ")}${relatorio.erros.length > 3 ? "..." : ""}`,
    };
  }
  return { mensagem: `${totalCriados} itens importados com sucesso.` };
}
