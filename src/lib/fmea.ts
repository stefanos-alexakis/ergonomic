/**
 * FMEA dos fatores psicossociais — prioriza, para o PGR, os fatores que o
 * Score FRPRT apontou (docs/proposta-fmea.html). Funções puras.
 *
 *   S · Severidade  = severidade-base do fator (tabela do admin, 1–5)
 *                     + 1 atestado CID-F relacionado ao trabalho e compatível
 *                     + 1 um desses afastamentos com mais de 15 dias
 *                     + 1 50% ou mais dos respondentes do setor expostos
 *                       (média individual ≥ 4 no fator)          → teto 5
 *   O · Ocorrência  = média do Eixo 1 no fator, em 5 faixas
 *   D · Detecção    = fator do Eixo 2 (controle), em 5 faixas; sem Eixo 2 = 5
 *
 * Prioridade de Ação (padrão AIAG-VDA 2019, severidade pesa mais): a matriz
 * S × O dá o nível; D 4–5 sobe um nível, D 1 desce um (S 5 nunca abaixo de
 * Média). RPN = S × O × D (1–125) só desempata.
 *
 * Cortes comparados em centésimos — 1,80 calculado não escorrega para a
 * faixa de cima por 1,8000000001.
 */

export type Prioridade = "ALTA" | "MEDIA" | "BAIXA";

export const PRIORIDADES: Record<Prioridade, { rotulo: string; cor: string; fundo: string; ordem: number }> = {
  ALTA: { rotulo: "Alta", cor: "#B91C1C", fundo: "#FEE2E2", ordem: 0 },
  MEDIA: { rotulo: "Média", cor: "#B45309", fundo: "#FEF3C7", ordem: 1 },
  BAIXA: { rotulo: "Baixa", cor: "#047857", fundo: "#D1FAE5", ordem: 2 },
};

/** Agravante da severidade quando um afastamento relacionado passa disto (vai ao INSS). */
export const DIAS_AFASTAMENTO_LONGO = 15;
/** Média individual no fator a partir da qual o respondente conta como exposto ("frequentemente"/"sempre"). */
export const MEDIA_EXPOSTO = 4;
/** Parcela de respondentes expostos que agrava a severidade. */
export const PARCELA_EXPOSTOS = 0.5;

const centesimos = (x: number) => Math.round(x * 100);

/** O: até 1,80 → 1 · 2,60 → 2 · 3,40 → 3 · 4,20 → 4 · acima → 5. */
export function notaOcorrencia(mediaEixo1: number): number {
  const c = centesimos(mediaEixo1);
  if (c <= 180) return 1;
  if (c <= 260) return 2;
  if (c <= 340) return 3;
  if (c <= 420) return 4;
  return 5;
}

/** D: ×0,80 → 1 · até ×0,85 → 2 · até ×0,90 → 3 · até ×0,95 → 4 · acima, ou sem Eixo 2 → 5. */
export function notaDeteccao(fatorEixo2: number | null): number {
  if (fatorEixo2 === null) return 5;
  const c = centesimos(fatorEixo2);
  if (c <= 80) return 1;
  if (c <= 85) return 2;
  if (c <= 90) return 3;
  if (c <= 95) return 4;
  return 5;
}

export type Agravante = "ATESTADO" | "AFASTAMENTO_LONGO" | "EXPOSTOS";

export const ROTULO_AGRAVANTE: Record<Agravante, string> = {
  ATESTADO: "atestado relacionado ao trabalho",
  AFASTAMENTO_LONGO: `afastamento acima de ${DIAS_AFASTAMENTO_LONGO} dias`,
  EXPOSTOS: `${Math.round(PARCELA_EXPOSTOS * 100)}% ou mais dos respondentes expostos`,
};

export type EntradaSeveridade = {
  base: number;
  /** Houve ocorrência CID-F com relação = Sim, compatível com o fator, no setor. */
  atestadoRelacionado: boolean;
  /** Maior afastamento (dias) entre essas ocorrências. */
  maiorAfastamentoDias: number;
  /** Respondentes do setor com média ≥ MEDIA_EXPOSTO no fator ÷ respondentes (null = sem dado). */
  parcelaExpostos: number | null;
};

export function calcularSeveridade(e: EntradaSeveridade): { valor: number; agravantes: Agravante[] } {
  const agravantes: Agravante[] = [];
  if (e.atestadoRelacionado) {
    agravantes.push("ATESTADO");
    // Afastamento longo só conta para ocorrência relacionada (sem relação não conta).
    if (e.maiorAfastamentoDias > DIAS_AFASTAMENTO_LONGO) agravantes.push("AFASTAMENTO_LONGO");
  }
  if (e.parcelaExpostos !== null && e.parcelaExpostos >= PARCELA_EXPOSTOS) agravantes.push("EXPOSTOS");
  return { valor: Math.min(5, Math.max(1, e.base) + agravantes.length), agravantes };
}

const A: Prioridade = "ALTA";
const M: Prioridade = "MEDIA";
const B: Prioridade = "BAIXA";

/** MATRIZ[S-1][O-1] — nível base antes do ajuste pela detecção. */
export const MATRIZ_S_O: Prioridade[][] = [
  /* S1 */ [B, B, B, B, M],
  /* S2 */ [B, B, B, M, M],
  /* S3 */ [B, B, M, M, A],
  /* S4 */ [B, M, M, A, A],
  /* S5 */ [M, A, A, A, A],
];

const NIVEIS: Prioridade[] = ["BAIXA", "MEDIA", "ALTA"];

export function calcularPrioridade(s: number, o: number, d: number): Prioridade {
  const base = MATRIZ_S_O[s - 1]![o - 1]!;
  let i = NIVEIS.indexOf(base);
  if (d >= 4) i = Math.min(2, i + 1);
  else if (d === 1) i = Math.max(s === 5 ? 1 : 0, i - 1);
  return NIVEIS[i]!;
}

export type ResultadoFmea = {
  s: number;
  sBase: number;
  agravantes: Agravante[];
  o: number;
  d: number;
  rpn: number;
  prioridade: Prioridade;
};

export function calcularFmea(params: {
  severidadeBase: number;
  mediaEixo1: number;
  fatorEixo2: number | null;
  atestadoRelacionado: boolean;
  maiorAfastamentoDias: number;
  parcelaExpostos: number | null;
}): ResultadoFmea {
  const sev = calcularSeveridade({
    base: params.severidadeBase,
    atestadoRelacionado: params.atestadoRelacionado,
    maiorAfastamentoDias: params.maiorAfastamentoDias,
    parcelaExpostos: params.parcelaExpostos,
  });
  const o = notaOcorrencia(params.mediaEixo1);
  const d = notaDeteccao(params.fatorEixo2);
  return {
    s: sev.valor,
    sBase: params.severidadeBase,
    agravantes: sev.agravantes,
    o,
    d,
    rpn: sev.valor * o * d,
    prioridade: calcularPrioridade(sev.valor, o, d),
  };
}

/** Alta → Média → Baixa; dentro da prioridade, maior RPN primeiro. */
export function compararFmea(a: ResultadoFmea, b: ResultadoFmea): number {
  return PRIORIDADES[a.prioridade].ordem - PRIORIDADES[b.prioridade].ordem || b.rpn - a.rpn;
}

export type Prazos = { plano: Date | null; implantacao: Date | null; reavaliacao: Date };

const somarDias = (d: Date, dias: number) => new Date(d.getTime() + dias * 86_400_000);
const somarMeses = (d: Date, meses: number) => {
  const r = new Date(d.getTime());
  r.setMonth(r.getMonth() + meses);
  return r;
};

/** Prazos contados da emissão do relatório (decisão do usuário). */
export const REGRA_PRAZOS: Record<Prioridade, { planoDias: number | null; implantacaoDias: number | null; reavaliacaoMeses: number; texto: string }> = {
  ALTA: { planoDias: 30, implantacaoDias: 90, reavaliacaoMeses: 6, texto: "plano em 30 dias · medidas em 90 dias · reavaliar em 6 meses" },
  MEDIA: { planoDias: 90, implantacaoDias: 180, reavaliacaoMeses: 12, texto: "plano em 90 dias · medidas em 180 dias · reavaliar em 12 meses" },
  BAIXA: { planoDias: null, implantacaoDias: null, reavaliacaoMeses: 24, texto: "manter e monitorar os controles · reavaliar no próximo ciclo do PGR (24 meses)" },
};

export function calcularPrazos(prioridade: Prioridade, emissao: Date): Prazos {
  const r = REGRA_PRAZOS[prioridade];
  return {
    plano: r.planoDias !== null ? somarDias(emissao, r.planoDias) : null,
    implantacao: r.implantacaoDias !== null ? somarDias(emissao, r.implantacaoDias) : null,
    reavaliacao: somarMeses(emissao, r.reavaliacaoMeses),
  };
}

/** Faixas de O e D como texto — para a tela e o PDF de critérios. */
export const FAIXAS_O = ["até 1,80", "1,81 a 2,60", "2,61 a 3,40", "3,41 a 4,20", "acima de 4,20"];
export const FAIXAS_D = [
  "×0,80 · controles eficazes",
  "×0,81 a ×0,85",
  "×0,86 a ×0,90 · precisam melhorar",
  "×0,91 a ×0,95",
  "×0,96 a ×1,00 · inexistentes ou sem avaliação do Eixo 2",
];
