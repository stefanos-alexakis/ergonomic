import { db } from "@/lib/db";
import { carregarRegrasPrazo } from "@/lib/prazos";
import { compararPorNumeroDaDimensao } from "@/lib/dashboard";
import type { ParametrosMetodologia } from "@/lib/relatorio/metodologia";

/** Valores vigentes no sistema para o texto da metodologia (questionário ativo). */
export async function carregarParametrosMetodologia(limiteAnonimato = 3): Promise<ParametrosMetodologia> {
  const ativo = { bloco: { questionario: { ativo: true } } };
  const [regrasPrazo, dimensoes, perguntasPgr] = await Promise.all([
    carregarRegrasPrazo(),
    db.dimensao.findMany({ where: ativo, select: { nome: true, severidade: { select: { severidade: true } } } }),
    db.pergunta.findMany({
      where: { vaiParaPgr: true, fatorRisco: { dimensao: ativo } },
      select: { ordemGlobal: true, situacaoInvestigada: true, fatorRisco: { select: { dimensao: { select: { nome: true } } } } },
      orderBy: { ordemGlobal: "asc" },
    }),
  ]);
  return {
    limiteAnonimato,
    regrasPrazo,
    severidades: [...dimensoes].sort(compararPorNumeroDaDimensao).map((d) => ({ fator: d.nome, severidade: d.severidade?.severidade ?? null })),
    situacoesPgr: perguntasPgr.map((p) => ({ numero: p.ordemGlobal, texto: p.situacaoInvestigada, fator: p.fatorRisco.dimensao.nome })),
  };
}
