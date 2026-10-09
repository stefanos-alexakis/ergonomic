import { db } from "@/lib/db";
import type { DadosConsultor } from "@/lib/consultores-util";

export { LIMITES_CONSULTOR, lerConsultor, type DadosConsultor } from "@/lib/consultores-util";

/** Cadastro de consultores que assinam os relatórios (área do admin). */

export function listarConsultores() {
  return db.consultor.findMany({ orderBy: { nome: "asc" } });
}

/** Retrato gravado no relatório emitido (não muda se o cadastro mudar). */
export type ConsultorAssinante = DadosConsultor;

export async function consultoresPorIds(ids: string[]): Promise<ConsultorAssinante[]> {
  if (ids.length === 0) return [];
  const lista = await db.consultor.findMany({ where: { id: { in: ids } } });
  // Mantém a ordem escolhida no rascunho.
  return ids
    .map((id) => lista.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map(({ nome, formacao, registro, cargo, email }) => ({ nome, formacao, registro, cargo, email }));
}
