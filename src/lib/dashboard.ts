import { db } from "@/lib/db";
import { aplicarSupressaoGruposPequenos, type GrupoComSupressao } from "@/lib/agregacao";
import { CONCLUSOES, SCORE_BASE_MAXIMO, SCORE_BASE_MINIMO, concluir } from "@/lib/score-final";

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

export { SCORE_BASE_MAXIMO, SCORE_BASE_MINIMO } from "@/lib/score-final";

/** média está sempre em 1–5 (1 = nunca/melhor, 5 = sempre/pior) após normalizarValor. */
export function calcularScoreBase(mediaGeral: number): number {
  const amplitude = SCORE_BASE_MAXIMO - SCORE_BASE_MINIMO;
  return Math.round(SCORE_BASE_MINIMO + (amplitude * (5 - mediaGeral)) / 4);
}

/**
 * Faixa de risco do Score Base — a MESMA régua do Painel FRPRT: os cortes
 * da metodologia (3,00 / 4,00) aplicados à média 1–5, pela mesma função
 * `concluir`. Antes o Score Base usava faixas próprias da nota (400/600) e
 * a mesma nota podia ter rótulos diferentes nas duas telas. Recebe a média
 * (não a nota) para o arredondamento da nota nunca mudar a faixa.
 *   média ≤ 3,00 → nota ≥ 450 · Baixo risco (verde)
 *   média ≤ 4,00 → nota ≥ 275 · Médio risco (amarelo)
 *   acima        → nota < 275 · Alto risco (vermelho)
 */
export function calcularNivelRisco(media: number): { rotulo: string; tom: "perigo" | "atencao" | "sucesso" } {
  const c = CONCLUSOES[concluir(media)];
  return { rotulo: c.curto, tom: c.tom };
}

/**
 * Número do fator no início do nome ("10. Equilíbrio…" → 10, e também
 * "1.Instrução…" sem espaço). `Dimensao.ordem` não serve: reinicia a cada
 * bloco do questionário.
 */
export function numeroDaDimensao(nome: string): number | null {
  const m = /^\s*(\d+)/.exec(nome);
  return m ? Number(m[1]) : null;
}

/** 1, 2, …, 13; dimensões sem número vão para o fim, em ordem alfabética. */
export function compararPorNumeroDaDimensao(a: { nome: string }, b: { nome: string }): number {
  const na = numeroDaDimensao(a.nome) ?? Number.POSITIVE_INFINITY;
  const nb = numeroDaDimensao(b.nome) ?? Number.POSITIVE_INFINITY;
  return na !== nb ? na - nb : a.nome.localeCompare(b.nome, "pt-BR");
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
  // Total de respostas concluídas já considerando o filtro atual — usado
  // pra decidir se a navegação por resposta individual pode ser liberada
  // (mesma regra de supressão de grupo pequeno, constitution.md §3: um
  // filtro que afunila pra poucas pessoas é, na prática, o mesmo risco de
  // reidentificação que um grupo pequeno).
  totalFiltrado: number;
  // true quando há dados suficientes na pesquisa toda, mas o filtro atual
  // (setor/departamento) afunilou pra menos gente que o limite de
  // supressão — distinto de `suficiente: false`, que significa
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
    },
    include: {
      setor: true,
      departamento: true,
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
  // Ordem numérica do fator (1 a 13), pedida pela cliente — não pela média.
  const porDimensao = Array.from(itensPorDimensao.entries())
    .map(([nome, itens]) => ({ nome, media: calcularMedia(itens) ?? 0 }))
    .sort(compararPorNumeroDaDimensao);

  const resumirCampo = (campo: "setor" | "departamento") => {
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
    totalFiltrado: respostas.length,
    filtroSuprimido: false,
  };
}

export type RespostaIndividual = {
  id: string;
  setor: string | null;
  departamento: string | null;
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
    },
    orderBy: { concluidoEm: "desc" },
    include: {
      setor: true,
      departamento: true,
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
      concluidoEm: r.concluidoEm!,
      media,
      scoreBase: calcularScoreBase(media),
    };
  });
}
