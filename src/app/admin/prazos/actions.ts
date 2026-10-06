"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor } from "@/lib/tenant";

export type EstadoPrazos = { erro?: string; sucesso?: boolean } | undefined;

const PRIORIDADES = ["ALTA", "MEDIA", "BAIXA"] as const;
const ROTULO = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa" } as const;

function inteiro(v: FormDataEntryValue | null): number | null | undefined {
  const t = String(v ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : undefined;
}

/**
 * Prazos padrão por prioridade FMEA — metodologia (todas as empresas), só
 * admin da plataforma. Reavaliação limitada a 24 meses (NR-1: a avaliação
 * de riscos é revista a cada dois anos, no máximo).
 */
export async function salvarPrazosAction(_e: EstadoPrazos, fd: FormData): Promise<EstadoPrazos> {
  const actor = await getActor();
  if (!actor?.isPlatformAdmin) return { erro: "Sem permissão." };

  const linhas = [];
  for (const p of PRIORIDADES) {
    const planoDias = inteiro(fd.get(`plano_${p}`));
    const implantacaoDias = inteiro(fd.get(`implantacao_${p}`));
    const reavaliacaoMeses = inteiro(fd.get(`reavaliacao_${p}`));
    const nome = ROTULO[p];
    if (planoDias === undefined || implantacaoDias === undefined || reavaliacaoMeses === undefined) {
      return { erro: `${nome}: use números inteiros.` };
    }
    if (reavaliacaoMeses === null || reavaliacaoMeses < 1 || reavaliacaoMeses > 24) {
      return { erro: `${nome}: reavaliação de 1 a 24 meses (a NR-1 exige revisão a cada 2 anos, no máximo).` };
    }
    for (const [v, rotulo] of [
      [planoDias, "plano"],
      [implantacaoDias, "implantação"],
    ] as const) {
      if (v !== null && (v < 1 || v > 730)) return { erro: `${nome}: prazo de ${rotulo} de 1 a 730 dias.` };
    }
    if (implantacaoDias !== null && planoDias === null) return { erro: `${nome}: informe o prazo do plano antes do de implantação.` };
    if (planoDias !== null && implantacaoDias !== null && implantacaoDias < planoDias) {
      return { erro: `${nome}: a implantação não pode vencer antes do plano.` };
    }
    linhas.push({ prioridade: p, planoDias, implantacaoDias, reavaliacaoMeses });
  }

  await db.$transaction(
    linhas.map((l) =>
      db.prazoPrioridade.upsert({
        where: { prioridade: l.prioridade },
        update: { ...l, atualizadoPorId: actor.userId },
        create: { ...l, atualizadoPorId: actor.userId },
      }),
    ),
  );
  revalidatePath("/admin/prazos");
  revalidatePath("/gestor/painel");
  return { sucesso: true };
}
