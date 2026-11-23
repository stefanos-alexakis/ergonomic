import { db } from "@/lib/db";
import { painelDisponivel } from "@/lib/relatorios-eixo1-util";

export type LinhaRelatorioEixo1 = {
  id: string;
  nome: string;
  dataInicio: Date;
  dataFim: Date;
  /** Códigos de participante gerados (os de teste não entram). */
  codigos: number;
  /** Respostas concluídas de participantes (os códigos de teste não entram). */
  concluidas: number;
  /** false = aguardando respostas suficientes: a linha aparece, sem link. */
  painelDisponivel: boolean;
  arquivadaEm: Date | null;
  exclusaoSolicitadaEm: Date | null;
};

/**
 * Pesquisas da empresa com o que o atalho mostra. Arquivadas e com exclusão
 * solicitada ficam de fora. A empresa vem sempre da sessão (quem chama).
 */
export async function listarRelatoriosEixo1(workspaceId: string): Promise<LinhaRelatorioEixo1[]> {
  const pesquisas = await db.pesquisa.findMany({
    where: { workspaceId, arquivadaEm: null, exclusaoSolicitadaEm: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, nome: true, dataInicio: true, dataFim: true, limiteSupressaoGrupo: true, arquivadaEm: true, exclusaoSolicitadaEm: true },
  });
  if (pesquisas.length === 0) return [];

  const ids = pesquisas.map((p) => p.id);
  const [codigos, concluidas] = await Promise.all([
    db.codigoAcesso.groupBy({ by: ["pesquisaId"], where: { pesquisaId: { in: ids }, tipo: "PARTICIPANTE" }, _count: { _all: true } }),
    db.codigoAcesso.groupBy({
      by: ["pesquisaId"],
      where: { pesquisaId: { in: ids }, tipo: "PARTICIPANTE", status: "CONCLUIDO" },
      _count: { _all: true },
    }),
  ]);
  const totalCodigos = new Map(codigos.map((c) => [c.pesquisaId, c._count._all]));
  const totalConcluidas = new Map(concluidas.map((c) => [c.pesquisaId, c._count._all]));

  return pesquisas.map((p) => {
    const feitas = totalConcluidas.get(p.id) ?? 0;
    return {
      id: p.id,
      nome: p.nome,
      dataInicio: p.dataInicio,
      dataFim: p.dataFim,
      codigos: totalCodigos.get(p.id) ?? 0,
      concluidas: feitas,
      painelDisponivel: painelDisponivel(feitas, p.limiteSupressaoGrupo),
      arquivadaEm: p.arquivadaEm,
      exclusaoSolicitadaEm: p.exclusaoSolicitadaEm,
    };
  });
}
