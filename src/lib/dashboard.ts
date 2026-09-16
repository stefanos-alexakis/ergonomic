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

/**
 * Média ponderada pelo peso de cada pergunta (Hozana configura na área
 * administrativa — padrão 1 para todas). Peso ausente/undefined conta
 * como 1, pra nunca quebrar uma chamada antiga que não passe o campo.
 */
export function calcularMedia(itens: { valor: number; polaridade: Polaridade; peso?: number }[]): number | null {
  if (itens.length === 0) return null;
  let somaPonderada = 0;
  let somaPesos = 0;
  for (const i of itens) {
    const peso = i.peso ?? 1;
    somaPonderada += normalizarValor(i.valor, i.polaridade) * peso;
    somaPesos += peso;
  }
  if (somaPesos === 0) return null;
  return somaPonderada / somaPesos;
}

// Eixo 1 (percepção) vale até 80% da pontuação final — os 20% restantes
// ficam reservados para os multiplicadores dos Eixos 2 (políticas,
// atenuante) e 3 (atestados, agravante), ainda não implementados
// (decisão do usuário, ver review.md). Escala estilo Serasa: 1000 =
// melhor cenário possível.
export const SCORE_BASE_MAXIMO = 800;

// Piso: mesmo no pior cenário possível (todo mundo respondeu "sempre" em
// tudo), a nota base não zera — trava em 100. Sem piso, um agravante do
// Eixo 3 aplicado sobre um score já em 0 não teria efeito nenhum (0 ×
// qualquer coisa = 0, ou 0 − qualquer coisa continua ilegível como
// "nota"), justo no cenário mais grave, onde o agravante mais precisa
// aparecer (decisão do usuário).
export const SCORE_BASE_MINIMO = 100;

/** média está sempre em 1–5 (1 = nunca/melhor, 5 = sempre/pior) após normalizarValor. */
export function calcularScoreBase(mediaGeral: number): number {
  const amplitude = SCORE_BASE_MAXIMO - SCORE_BASE_MINIMO;
  return Math.round(SCORE_BASE_MINIMO + (amplitude * (5 - mediaGeral)) / 4);
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

export type FiltrosDashboard = {
  setorId?: string;
  departamentoId?: string;
  segmentoId?: string;
  funcaoId?: string;
};

export type DashboardPesquisa = {
  contadores: { distribuidos: number; iniciadas: number; concluidas: number };
  suficiente: boolean; // false = "ainda não há respostas suficientes" (tasks.md Fase 6)
  limiteSupressaoGrupo: number;
  mediaGeral: number | null;
  scoreBase: number | null;
  scoreBaseMaximo: number;
  porDimensao: { nome: string; media: number }[];
  porSetor: GrupoComSupressao<ResumoGrupo>[];
  porDepartamento: GrupoComSupressao<ResumoGrupo>[];
  porSegmento: GrupoComSupressao<ResumoGrupo>[];
  porFuncao: GrupoComSupressao<ResumoGrupo>[];
  // Total de respostas concluídas já considerando o filtro atual — usado
  // pra decidir se a navegação por resposta individual pode ser liberada
  // (mesma regra de supressão de grupo pequeno, constitution.md §3: um
  // filtro que afunila pra poucas pessoas é, na prática, o mesmo risco de
  // reidentificação que um grupo pequeno).
  totalFiltrado: number;
  // true quando há dados suficientes na pesquisa toda, mas o filtro atual
  // (setor/departamento/segmento/função) afunilou pra menos gente que o
  // limite de supressão — distinto de `suficiente: false`, que significa
  // que a pesquisa inteira ainda não tem respostas suficientes.
  filtroSuprimido: boolean;
};

export async function calcularDashboard(
  pesquisaId: string,
  filtros: FiltrosDashboard = {},
): Promise<DashboardPesquisa> {
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
      scoreBase: null,
      scoreBaseMaximo: SCORE_BASE_MAXIMO,
      porDimensao: [],
      porSetor: [],
      porDepartamento: [],
      porSegmento: [],
      porFuncao: [],
      totalFiltrado: 0,
      filtroSuprimido: false,
    };
  }

  // Só respostas CONCLUÍDAS de códigos PARTICIPANTE entram na estatística
  // oficial — nunca rascunho, nunca código de teste (constitution.md §3).
  const respostas = await db.resposta.findMany({
    where: {
      concluidoEm: { not: null },
      codigoAcesso: { pesquisaId, tipo: "PARTICIPANTE" },
      ...(filtros.setorId ? { setorId: filtros.setorId } : {}),
      ...(filtros.departamentoId ? { departamentoId: filtros.departamentoId } : {}),
      ...(filtros.segmentoId ? { segmentoId: filtros.segmentoId } : {}),
      ...(filtros.funcaoId ? { funcaoId: filtros.funcaoId } : {}),
    },
    include: {
      setor: true,
      departamento: true,
      segmento: true,
      funcao: true,
      itens: {
        include: { pergunta: { select: { polaridade: true, peso: true, fatorRisco: { select: { dimensao: true } } } } },
      },
    },
  });

  // O filtro pode afunilar pra menos gente que o limite de supressão —
  // nesse caso, nada de estatística é exibido também para o recorte
  // filtrado (mesma regra dos grupos, agora aplicada ao recorte inteiro).
  if (respostas.length < limiteSupressaoGrupo) {
    return {
      contadores,
      suficiente: true,
      limiteSupressaoGrupo,
      mediaGeral: null,
      scoreBase: null,
      scoreBaseMaximo: SCORE_BASE_MAXIMO,
      porDimensao: [],
      porSetor: [],
      porDepartamento: [],
      porSegmento: [],
      porFuncao: [],
      totalFiltrado: respostas.length,
      filtroSuprimido: true,
    };
  }

  const mediasPessoais = respostas.map((r) => ({
    resposta: r,
    media:
      calcularMedia(r.itens.map((i) => ({ valor: i.valor, polaridade: i.pergunta.polaridade, peso: i.pergunta.peso }))) ??
      0,
  }));

  const mediaGeral =
    mediasPessoais.length > 0
      ? mediasPessoais.reduce((acc, m) => acc + m.media, 0) / mediasPessoais.length
      : null;
  const scoreBase = mediaGeral !== null ? calcularScoreBase(mediaGeral) : null;

  // Por dimensão: junta todas as respostas de todas as pessoas que
  // caem naquela dimensão e faz a média normalizada.
  const itensPorDimensao = new Map<string, { valor: number; polaridade: Polaridade; peso: number }[]>();
  for (const r of respostas) {
    for (const item of r.itens) {
      const nomeDimensao = item.pergunta.fatorRisco.dimensao.nome;
      const lista = itensPorDimensao.get(nomeDimensao) ?? [];
      lista.push({ valor: item.valor, polaridade: item.pergunta.polaridade, peso: item.pergunta.peso });
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
    scoreBase,
    scoreBaseMaximo: SCORE_BASE_MAXIMO,
    porDimensao,
    porSetor: resumirCampo("setor"),
    porDepartamento: resumirCampo("departamento"),
    porSegmento: resumirCampo("segmento"),
    porFuncao: resumirCampo("funcao"),
    totalFiltrado: respostas.length,
    filtroSuprimido: false,
  };
}

export type RespostaIndividual = {
  id: string;
  setor: string | null;
  departamento: string | null;
  segmento: string | null;
  funcao: string | null;
  concluidoEm: Date;
  media: number;
  scoreBase: number;
};

/**
 * Lista respostas individuais (anônimas — nenhum campo identificável
 * existe na tabela Resposta pra começo de conversa) para navegação no
 * dashboard. SEMPRE gate isto atrás do mesmo limite de supressão de
 * grupo pequeno antes de chamar — esta função não decide isso sozinha,
 * quem chama (a página) já checou `totalFiltrado >= limiteSupressaoGrupo`.
 */
export async function listarRespostasIndividuais(
  pesquisaId: string,
  filtros: FiltrosDashboard = {},
): Promise<RespostaIndividual[]> {
  const respostas = await db.resposta.findMany({
    where: {
      concluidoEm: { not: null },
      codigoAcesso: { pesquisaId, tipo: "PARTICIPANTE" },
      ...(filtros.setorId ? { setorId: filtros.setorId } : {}),
      ...(filtros.departamentoId ? { departamentoId: filtros.departamentoId } : {}),
      ...(filtros.segmentoId ? { segmentoId: filtros.segmentoId } : {}),
      ...(filtros.funcaoId ? { funcaoId: filtros.funcaoId } : {}),
    },
    orderBy: { concluidoEm: "desc" },
    include: {
      setor: true,
      departamento: true,
      segmento: true,
      funcao: true,
      itens: {
        include: { pergunta: { select: { polaridade: true, peso: true } } },
      },
    },
  });

  return respostas.map((r) => {
    const media =
      calcularMedia(r.itens.map((i) => ({ valor: i.valor, polaridade: i.pergunta.polaridade, peso: i.pergunta.peso }))) ??
      0;
    return {
      id: r.id,
      setor: r.setor?.nome ?? null,
      departamento: r.departamento?.nome ?? null,
      segmento: r.segmento?.nome ?? null,
      funcao: r.funcao?.nome ?? null,
      concluidoEm: r.concluidoEm!,
      media,
      scoreBase: calcularScoreBase(media),
    };
  });
}
