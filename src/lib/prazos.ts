import { db } from "@/lib/db";
import { PRAZOS_PADRAO, type Prioridade, type RegrasPrazo } from "@/lib/fmea";

const PRIORIDADES_VALIDAS: Prioridade[] = ["ALTA", "MEDIA", "BAIXA"];

/** Prazos padrão vigentes: o que o admin cadastrou, completado pelos padrões do código. */
export async function carregarRegrasPrazo(): Promise<RegrasPrazo> {
  const linhas = await db.prazoPrioridade.findMany();
  const regras: RegrasPrazo = { ...PRAZOS_PADRAO };
  for (const l of linhas) {
    if (!PRIORIDADES_VALIDAS.includes(l.prioridade as Prioridade)) continue;
    regras[l.prioridade as Prioridade] = {
      planoDias: l.planoDias,
      implantacaoDias: l.implantacaoDias,
      reavaliacaoMeses: l.reavaliacaoMeses,
    };
  }
  return regras;
}
