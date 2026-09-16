"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/tenant";
import { workspaceInputSchema } from "@/lib/validation";
import { criarEmpresaComGestor } from "@/lib/workspace";
import { salvarLogoWorkspace } from "@/lib/upload";

export type EstadoCriarEmpresa = { erro?: string } | undefined;

export async function criarEmpresaAction(
  _estadoAnterior: EstadoCriarEmpresa,
  formData: FormData,
): Promise<EstadoCriarEmpresa> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) {
    return { erro: "Sem permissão." };
  }

  const nome = String(formData.get("nome") ?? "");
  const corPrimariaRaw = String(formData.get("corPrimaria") ?? "").trim();
  const corSecundariaRaw = String(formData.get("corSecundaria") ?? "").trim();
  const gestorNome = String(formData.get("gestorNome") ?? "");
  const gestorEmail = String(formData.get("gestorEmail") ?? "");
  const gestorSenha = String(formData.get("gestorSenha") ?? "");

  const validado = workspaceInputSchema.safeParse({
    nome,
    corPrimaria: corPrimariaRaw || null,
    corSecundaria: corSecundariaRaw || null,
  });
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (gestorNome.trim().length < 2 || !gestorEmail.includes("@") || gestorSenha.length < 8) {
    return { erro: "Confira nome, e-mail e senha do gestor (senha com 8+ caracteres)." };
  }

  let logoUrl: string | null = null;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    const resultado = await salvarLogoWorkspace(logoFile);
    if (!resultado.ok) return { erro: resultado.erro };
    logoUrl = resultado.caminhoPublico;
  }

  const resultado = await criarEmpresaComGestor({
    nomeEmpresa: validado.data.nome,
    corPrimaria: validado.data.corPrimaria,
    corSecundaria: validado.data.corSecundaria,
    logoUrl,
    gestorNome,
    gestorEmail,
    gestorSenha,
  });

  if (!resultado.ok) return { erro: resultado.erro };

  redirect("/admin");
}
