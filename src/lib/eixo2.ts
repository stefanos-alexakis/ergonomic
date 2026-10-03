/**
 * Pontuação do Eixo 2 — medidas de controle (metodologia FRPRT da cliente,
 * metodologia_frprt_.html §4). Toda a matemática do Eixo 2 mora aqui, como
 * a do Eixo 1 mora em dashboard.ts.
 *
 * Cada medida analisada vale 0,80 (existente e eficaz, ou não se aplica),
 * 0,90 (existente, precisa melhorar) ou 1,00 (inexistente). O "fator do
 * Eixo 2" de um fator de risco num setor é a média dessas medidas —
 * ponderada pelos pesos configurados pelo admin (com todos os pesos em 1, é
 * exatamente a média proporcional da metodologia). Mais tarde, no score
 * final: Resultado = Eixo 1 × Fator do Eixo 2 × Fator do Eixo 3.
 *
 * Independente do Eixo 1 por decisão do usuário: só se cruzam no painel final.
 */

export const CONDICOES = ["EFICAZ", "PRECISA_MELHORAR", "INEXISTENTE", "NAO_SE_APLICA"] as const;
export type Condicao = (typeof CONDICOES)[number];

export const VALOR_CONDICAO: Record<Condicao, number> = {
  EFICAZ: 0.8,
  // N.A. = mesmo valor de "eficaz": o trabalhador não está exposto à
  // situação, então não há deficiência de controle (metodologia §4). Fica
  // como opção separada para o relatório/PGR distinguir os dois casos.
  NAO_SE_APLICA: 0.8,
  PRECISA_MELHORAR: 0.9,
  INEXISTENTE: 1.0,
};

export const ROTULO_CONDICAO: Record<Condicao, string> = {
  EFICAZ: "Existente e eficaz",
  PRECISA_MELHORAR: "Existente, precisa melhorar",
  INEXISTENTE: "Inexistente",
  NAO_SE_APLICA: "Não se aplica",
};

export function ehCondicao(valor: unknown): valor is Condicao {
  return typeof valor === "string" && (CONDICOES as readonly string[]).includes(valor);
}

/** Média ponderada das medidas; `null` quando não há nenhuma respondida. */
export function calcularFatorEixo2(itens: { condicao: Condicao; peso?: number }[]): number | null {
  let soma = 0;
  let pesos = 0;
  for (const item of itens) {
    const peso = item.peso ?? 1;
    if (!(peso > 0)) continue;
    soma += VALOR_CONDICAO[item.condicao] * peso;
    pesos += peso;
  }
  return pesos === 0 ? null : soma / pesos;
}

export type ClasseEixo2 = "BOM" | "REGULAR" | "RUIM";

/**
 * Cortes no meio do caminho: entre "tudo eficaz" (0,80) e "tudo precisa
 * melhorar" (0,90) → 0,85; entre este e "tudo inexistente" (1,00) → 0,95.
 * Comparação em centésimos de milésimo para 0,85 calculado não virar
 * 0,8500000001 e cair na faixa errada.
 */
export function classificarFatorEixo2(fator: number): {
  classe: ClasseEixo2;
  rotulo: string;
  tom: "sucesso" | "atencao" | "perigo";
} {
  const f = Math.round(fator * 10000);
  if (f <= 8500) return { classe: "BOM", rotulo: "Bom", tom: "sucesso" };
  if (f <= 9500) return { classe: "REGULAR", rotulo: "Regular", tom: "atencao" };
  return { classe: "RUIM", rotulo: "Ruim", tom: "perigo" };
}

/** 0,80 → 100 % controlado; 1,00 → 0 %. Leitura rápida para o painel. */
export function indiceControle(fator: number): number {
  const indice = Math.round(((1 - fator) / 0.2) * 100);
  return Math.min(100, Math.max(0, indice));
}

/** "×0,82" — formato usado em toda a interface. */
export function formatarFator(fator: number): string {
  return `×${fator.toFixed(2).replace(".", ",")}`;
}
