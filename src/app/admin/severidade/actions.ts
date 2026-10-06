"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";

export type EstadoSeveridade = { erro?: string; sucesso?: boolean } | undefined;

/**
 * Salva a severidade-base FMEA dos fatores do questionário ativo. É parte da
 * metodologia (vale para todas as empresas), então só o admin da plataforma
 * altera — checado AQUI, não só no middleware: Server Actions podem ser
 * chamadas contra qualquer rota.
 *
 * Campos: `sev_<dimensaoId>` (1–5) e `just_<dimensaoId>` (justificativa).
 */
export async function salvarSeveridadeAction(
  _estadoAnterior: EstadoSeveridade,
  formData: FormData,
): Promise<EstadoSeveridade> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };

  const itens: { dimensaoId: string; severidade: number; justificativa: string }[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (!chave.startsWith("sev_")) continue;
    const dimensaoId = chave.slice("sev_".length);
    const severidade = Number(valor);
    if (!Number.isInteger(severidade) || severidade < 1 || severidade > 5) {
      return { erro: "A severidade de cada fator precisa ser um número inteiro de 1 a 5." };
    }
    const justificativa = String(formData.get(`just_${dimensaoId}`) ?? "").trim();
    if (justificativa.length < 10) {
      return { erro: "Toda severidade precisa de uma justificativa técnica (mínimo de 10 caracteres)." };
    }
    if (justificativa.length > 1000) return { erro: "Justificativa muito longa (máximo de 1.000 caracteres)." };
    itens.push({ dimensaoId, severidade, justificativa });
  }
  if (itens.length === 0) return { erro: "Nenhum fator encontrado no formulário." };

  // Só dimensões do questionário ativo — id de outra versão cancela tudo.
  const ativas = await db.dimensao.findMany({
    where: { id: { in: itens.map((i) => i.dimensaoId) }, bloco: { questionario: { ativo: true } } },
    select: { id: true },
  });
  if (ativas.length !== itens.length) {
    return { erro: "Um ou mais fatores não pertencem ao questionário em uso. Recarregue a página." };
  }

  await db.$transaction(
    itens.map((i) =>
      db.severidadeFator.upsert({
        where: { dimensaoId: i.dimensaoId },
        update: { severidade: i.severidade, justificativa: i.justificativa, atualizadoPorId: actor.userId },
        create: { ...i, atualizadoPorId: actor.userId },
      }),
    ),
  );
  revalidatePath("/admin/severidade");
  revalidatePath("/gestor/painel");
  return { sucesso: true };
}
