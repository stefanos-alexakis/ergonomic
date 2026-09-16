import { db } from "@/lib/db";
import { aplicarSupressaoGruposPequenos, type GrupoComSupressao } from "@/lib/agregacao";

/**
 * Toda a matemática de indicador mora aqui, num único lugar — nenhum
 * painel calcula média ou agrupamento "na mão" em outro arquivo. Isso é
 * o que garante que a exclusão dos códigos de teste e a normalização de
 * polaridade nunca fiquem esquecidas numa tela nova (constitution.md
 * §3, data-model.md nota de polaridade).
 */

export type Polaridade = "MAIOR_PIOR" | "MAIOR_MELHOR";

export function normalizarValor(valor: number, polaridade: Polaridade): number {
  return polaridade === "MAIOR_MELHOR" ? 6 - valor : valor;
}

export function calcularMedia(itens: { valor: number; polaridade: Polaridade }[]): number | null {
  if (itens.length === 0) return null;
  const soma = itens.reduce((acc, i) => acc + normalizarValor(i.valor, i.polaridade), 0);
  return soma / itens.length;
}

export type ResumoGrupo = { nome: string; total: number; mediaGeral: number };

/** Agrupa respondentes (já com a média pessoal calculada) por um nome de grupo. */
export function agruparEResumir(respondentes: { grupoNome: string; media: number }[]): ResumoGrupo[] {
  const mapa = new Map<string, { total: number; somaMedia: number }>();
  for (const r of respondentes) {
    const atual = mapa.get(r.grupoNome) ?? { total: 0, somaMedia: 0 };
    atual.total++;
    atual.somaMedia += r.media;
    mapa.set(r.grupoNome, atual);
  }
  return Array.from(mapa.entries()).map(([nome, v]) => ({
    nome,
    total: v.total,
    mediaGeral: v.somaMedia / v.total,
  }));
}

export type DashboardPesquisa = {
  contadores: { distribuidos: number; iniciadas: number; concluidas: number };
  suficiente: boolean; // false = "ainda não há respostas suficientes" (tasks.md Fase 6)
  limiteSupressaoGrupo: number;
  mediaGeral: number | null;
  porDimensao: { nome: string; media: number }[];
  porSetor: GrupoComSupressao<ResumoGrupo>[];
  porDepartamento: GrupoComSupressao<ResumoGrupo>[];
  porSegmento: GrupoComSupressao<ResumoGrupo>[];
  porFuncao: GrupoComSupressao<ResumoGrupo>[];
};

export async function calcularDashboard(pesquisaId: string): Promise<DashboardPesquisa> {
  const pesquisa = await db.pesquisa.findUniqueOrThrow({ where: { id: pesquisaId } });

  const [distribuidos, iniciadas, concluidas] = await Promise.all([
    db.codigoAcesso.count({ where: { pesquisaId, tipo: "PARTICIPANTE" } }),
    db.codigoAcesso.count({ where: { pesquisaId, tipo: "PARTICIPANTE", status: { in: ["INICIADO", "CONCLUIDO"] } } }),
    db.codigoAcesso.count({ where: { pesquisaId, tipo: "PARTICIPANTE", status: "CONCLUIDO" } }),
  ]);

  const contadores = { distribuidos, iniciadas, concluidas };
  const limiteSupressaoGrupo = pesquisa.limiteSupressaoGrupo;

  if (concluidas < limiteSupressaoGrupo) {
    return {
      contadores,
      suficiente: false,
      limiteSupressaoGrupo,
      mediaGeral: null,
      porDimensao: [],
      porSetor: [],
      porDepartamento: [],
      porSegmento: [],
      porFuncao: [],
    };
  }

  // Só respostas CONCLUÍDAS de códigos PARTICIPANTE entram na estatística
  // oficial — nunca rascunho, nunca código de teste (constitution.md §3).
  const respostas = await db.resposta.findMany({
    where: { concluidoEm: { not: null }, codigoAcesso: { pesquisaId, tipo: "PARTICIPANTE" } },
    include: {
      setor: true,
      departamento: true,
      segmento: true,
      funcao: true,
      itens: { include: { pergunta: { select: { polaridade: true, fatorRisco: { select: { dimensao: true } } } } } },
    },
  });

  const mediasPessoais = respostas.map((r) => ({
    resposta: r,
    media: calcularMedia(r.itens.map((i) => ({ valor: i.valor, polaridade: i.pergunta.polaridade }))) ?? 0,
  }));

  const mediaGeral =
    mediasPessoais.length > 0
      ? mediasPessoais.reduce((acc, m) => acc + m.media, 0) / mediasPessoais.length
      : null;

  // Por dimensão: junta todas as respostas de todas as pessoas que
  // caem naquela dimensão e faz a média normalizada.
  const itensPorDimensao = new Map<string, { valor: number; polaridade: Polaridade }[]>();
  for (const r of respostas) {
    for (const item of r.itens) {
      const nomeDimensao = item.pergunta.fatorRisco.dimensao.nome;
      const lista = itensPorDimensao.get(nomeDimensao) ?? [];
      lista.push({ valor: item.valor, polaridade: item.pergunta.polaridade });
      itensPorDimensao.set(nomeDimensao, lista);
    }
  }
  const porDimensao = Array.from(itensPorDimensao.entries())
    .map(([nome, itens]) => ({ nome, media: calcularMedia(itens) ?? 0 }))
    .sort((a, b) => b.media - a.media);

  const resumirCampo = (campo: "setor" | "departamento" | "segmento" | "funcao") => {
    const respondentesDoCampo = mediasPessoais
      .filter((m) => m.resposta[campo] != null)
      .map((m) => ({ grupoNome: m.resposta[campo]!.nome, media: m.media }));
    const resumo = agruparEResumir(respondentesDoCampo);
    return aplicarSupressaoGruposPequenos(
      resumo.map((r) => ({ ...r, total: r.total })),
      limiteSupressaoGrupo,
    );
  };

  return {
    contadores,
    suficiente: true,
    limiteSupressaoGrupo,
    mediaGeral,
    porDimensao,
    porSetor: resumirCampo("setor"),
    porDepartamento: resumirCampo("departamento"),
    porSegmento: resumirCampo("segmento"),
    porFuncao: resumirCampo("funcao"),
  };
}
