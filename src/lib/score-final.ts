/**
 * Score final FRPRT (metodologia §6 e §7) — funções puras.
 *
 *   Índice final = Eixo 1 (média 1–5, maior = pior) × Fator Eixo 2 × Fator Eixo 3
 *
 * Terminologia (cliente, out/2026): antes da matriz FMEA fala-se em
 * ÍNDICE (índice baixo/médio/alto, índice final); "risco" só depois da
 * classificação FMEA e no PGR, e nas conclusões da metodologia ("Sem risco
 * indicado", "Risco existente").
 *
 * Tudo — cor, faixa e conclusão — sai dos cortes da metodologia
 * (3,00 / 4,00) aplicados a esse índice. O PGR é decidido à parte, por
 * situação (ver painel-frprt.ts): só as situações inerentes à função,
 * acima de 3,00. A antiga nota 100–1000
 * foi retirada do sistema (decisão do usuário): era só uma conversão do
 * índice para exibição e não entrava em nenhum cálculo.
 */

export function calcularRiscoFinal(eixo1: number, fatorEixo2: number, fatorEixo3: number): number {
  return eixo1 * fatorEixo2 * fatorEixo3;
}

export type Conclusao = "SEM_RISCO" | "CONTROLE" | "RISCO_EXISTENTE";

export const CONCLUSOES: Record<
  Conclusao,
  {
    rotulo: string;
    curto: string;
    descricao: string;
    encaminhamento: string;
    tom: "sucesso" | "atencao" | "perigo";
    /** Cores em hex — iguais no painel e no PDF. */
    cor: string;
    fundo: string;
  }
> = {
  SEM_RISCO: {
    rotulo: "Sem risco indicado",
    curto: "Índice baixo",
    descricao: "Percepções e controles dentro do esperado — manter o monitoramento.",
    encaminhamento: "Sem inclusão automática",
    tom: "sucesso",
    cor: "#047857",
    fundo: "#D1FAE5",
  },
  CONTROLE: {
    rotulo: "Percepção de perigos com controle existente",
    curto: "Índice médio",
    descricao: "Perigos percebidos, com medidas de controle existentes — acompanhar e manter os controles.",
    encaminhamento: "Acompanhar e manter controle",
    tom: "atencao",
    cor: "#B45309",
    fundo: "#FEF3C7",
  },
  RISCO_EXISTENTE: {
    rotulo: "Risco existente",
    curto: "Índice alto",
    descricao: "Risco psicossocial confirmado — exige plano de ação. Entra no PGR só pelas situações inerentes à função.",
    encaminhamento: "Plano de ação",
    tom: "perigo",
    cor: "#B91C1C",
    fundo: "#FEE2E2",
  },
};

/** Posição (0–100%) de um risco na régua de 1 a 5, para o marcador visual. */
export function posicaoNaRegua(risco: number): number {
  return Math.min(100, Math.max(0, ((risco - 1) / 4) * 100));
}

/** Até 3,00 sem risco; acima de 3,00 até 4,00 controle; acima de 4,00 risco existente. */
export function concluir(risco: number): Conclusao {
  const centesimos = Math.round(risco * 100); // 3,00 calculado não escorrega para 3,0000001
  if (centesimos <= 300) return "SEM_RISCO";
  if (centesimos <= 400) return "CONTROLE";
  return "RISCO_EXISTENTE";
}

/**
 * Efeito de cada eixo em pontos de risco — é como a imagem de referência
 * mostra (Eixo 2 "−0,5", Eixo 3 "+1,2") sem mudar a conta, que é
 * multiplicativa. A soma dos efeitos reconstrói o risco final.
 */
export function efeitosEmPontos(eixo1: number, fatorEixo2: number, fatorEixo3: number) {
  const ajustado = eixo1 * fatorEixo2;
  const final = ajustado * fatorEixo3;
  return { ajustado, final, efeitoEixo2: ajustado - eixo1, efeitoEixo3: final - ajustado };
}

/** "3,76" — duas casas, vírgula. */
export function formatarRisco(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

/** "+1,20" / "−0,50" — com sinal, para os efeitos em pontos. */
export function formatarEfeito(valor: number): string {
  const arredondado = Math.round(valor * 100) / 100;
  if (arredondado === 0) return "0,00";
  return `${arredondado > 0 ? "+" : "−"}${Math.abs(arredondado).toFixed(2).replace(".", ",")}`;
}
