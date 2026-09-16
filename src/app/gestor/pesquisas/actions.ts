"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { getWorkspaceDoGestor, criarPesquisa } from "@/lib/pesquisa";
import { db } from "@/lib/db";

export type EstadoCriarPesquisa = { erro?: string } | undefined;

export async function criarPesquisaAction(
  _estadoAnterior: EstadoCriarPesquisa,
  formData: FormData,
): Promise<EstadoCriarPesquisa> {
  const actor = await getActor();
  if (!actor) return { erro: "Sem sessão." };

  const workspace = await getWorkspaceDoGestor(actor.userId);
  if (!workspace) return { erro: "Usuário sem empresa vinculada." };

  const questionario = await db.questionario.findFirst({ where: { ativo: true } });
  if (!questionario) return { erro: "Nenhum questionário ativo cadastrado na plataforma." };

  const nome = String(formData.get("nome") ?? "");
  const dataInicioStr = String(formData.get("dataInicio") ?? "");
  const dataFimStr = String(formData.get("dataFim") ?? "");
  const licencasStr = String(formData.get("licencas") ?? "");

  const dataInicio = new Date(dataInicioStr);
  const dataFim = new Date(dataFimStr);
  const licencas = Number.parseInt(licencasStr, 10);

  if (Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
    return { erro: "Datas inválidas." };
  }

  const resultado = await criarPesquisa({
    workspaceId: workspace.id,
    questionarioId: questionario.id,
    nome,
    dataInicio,
    dataFim,
    licencasSolicitadas: licencas,
  });

  if (!resultado.ok) return { erro: resultado.erro };

  redirect("/gestor");
}
