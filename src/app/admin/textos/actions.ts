"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";
import { semCrlf } from "@/lib/plano-acao-util";
import { LIMITE_TEXTO_RELATORIO, TEXTOS_RELATORIO, type ChaveTexto } from "@/lib/textos-relatorio";

export type EstadoTexto = { erro?: string; sucesso?: string } | undefined;

/** Texto fixo do relatório (vale para todas as empresas) — só admin da plataforma. */
export async function salvarTextoAction(chave: ChaveTexto, _e: EstadoTexto, fd: FormData): Promise<EstadoTexto> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };
  if (!(chave in TEXTOS_RELATORIO)) return { erro: "Texto desconhecido." };
  const conteudo = semCrlf(String(fd.get("conteudo") ?? ""));
  if (conteudo.length > LIMITE_TEXTO_RELATORIO) {
    return { erro: `Texto muito longo (máximo ${LIMITE_TEXTO_RELATORIO.toLocaleString("pt-BR")} caracteres).` };
  }
  const usuario = await db.user.findUnique({ where: { id: actor.userId }, select: { nome: true } });
  await db.textoRelatorio.upsert({
    where: { chave },
    create: { chave, conteudo, atualizadoPor: usuario?.nome ?? null },
    update: { conteudo, atualizadoPor: usuario?.nome ?? null },
  });
  revalidatePath("/admin/textos");
  return { sucesso: "Texto salvo. Vale para os próximos relatórios emitidos." };
}
