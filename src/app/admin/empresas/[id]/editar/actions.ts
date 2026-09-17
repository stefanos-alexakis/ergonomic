"use server";

import { redirect, notFound } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { workspaceInputSchema } from "@/lib/validation";
import { atualizarEmpresa, getEmpresaParaEditar, redefinirSenhaGestor } from "@/lib/workspace";
import { salvarLogoWorkspace } from "@/lib/upload";

export type EstadoEditarEmpresa = { erro?: string } | undefined;

export async function atualizarEmpresaAction(
  workspaceId: string,
  _estadoAnterior: EstadoEditarEmpresa,
  formData: FormData,
): Promise<EstadoEditarEmpresa> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };

  const nome = String(formData.get("nome") ?? "");
  const corPrimariaRaw = String(formData.get("corPrimaria") ?? "").trim();
  const corSecundariaRaw = String(formData.get("corSecundaria") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  const gestorNome = String(formData.get("gestorNome") ?? "").trim();
  const gestorEmail = String(formData.get("gestorEmail") ?? "").trim();

  const validado = workspaceInputSchema.safeParse({
    nome,
    corPrimaria: corPrimariaRaw || null,
    corSecundaria: corSecundariaRaw || null,
  });
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (gestorEmail && !gestorEmail.includes("@")) {
    return { erro: "E-mail do gestor inválido." };
  }

  let logoUrl: string | undefined = undefined; // undefined = mantém o logo atual
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const resultado = await salvarLogoWorkspace(logoFile);
    if (!resultado.ok) return { erro: resultado.erro };
    logoUrl = resultado.caminhoPublico;
  }

  const resultado = await atualizarEmpresa(workspaceId, {
    nome: validado.data.nome,
    corPrimaria: validado.data.corPrimaria,
    corSecundaria: validado.data.corSecundaria,
    isActive,
    logoUrl,
    gestorNome: gestorNome || undefined,
    gestorEmail: gestorEmail || undefined,
  });

  if (!resultado.ok) return { erro: resultado.erro };

  redirect("/admin");
}

export type EstadoRedefinirSenha = { erro?: string; mensagem?: string } | undefined;

export async function redefinirSenhaGestorAction(
  gestorUserId: string,
  _estadoAnterior: EstadoRedefinirSenha,
  formData: FormData,
): Promise<EstadoRedefinirSenha> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };

  const novaSenha = String(formData.get("novaSenha") ?? "");
  const resultado = await redefinirSenhaGestor(gestorUserId, novaSenha);
  if (!resultado.ok) return { erro: resultado.erro };

  return { mensagem: "Senha redefinida com sucesso." };
}

export async function carregarEmpresaOuNotFound(workspaceId: string) {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) notFound();
  const dados = await getEmpresaParaEditar(workspaceId);
  if (!dados) notFound();
  return dados;
}
