/**
 * Score final FRPRT (metodologia §6 e §7) — funções puras.
 *
 *   Risco final = Eixo 1 (média 1–5, maior = pior) × Fator Eixo 2 × Fator Eixo 3
 *   Nota final  = 100 + 175 × (5 − risco)  — a mesma régua do Score Base
 *
 * Decisão do usuário: mostrar as duas leituras lado a lado, mas cor,
 * conclusão e encaminhamento ao PGR saem SEMPRE dos cortes da metodologia
 * (3,00 / 4,00) aplicados ao risco — nunca de faixas da nota — para não
 * haver duas classificações discordando na mesma tela.
 */

import { SCORE_BASE_MAXIMO, SCORE_BASE_MINIMO } from "@/lib/dashboard";

export function calcularRiscoFinal(eixo1: number, fatorEixo2: number, fatorEixo3: number): number {
  return eixo1 * fatorEixo2 * fatorEixo3;
}

/**
 * Mesma régua do Score Base (risco 1 → 800, risco 5 → 100). Com o Eixo 2
 * atenuando, o risco pode cair abaixo de 1 e a nota passar de 800 (máx.
 * ~835); com o Eixo 3 agravando, o risco passa de 5 e a nota trava no piso.
 */
export function notaDoRisco(risco: number): number {
  const amplitudePorPonto = (SCORE_BASE_MAXIMO - SCORE_BASE_MINIMO) / 4; // 175
  const nota = Math.round(SCORE_BASE_MINIMO + amplitudePorPonto * (5 - risco));
  return Math.min(1000, Math.max(SCORE_BASE_MINIMO, nota));
}

export type Conclusao = "SEM_RISCO" | "CONTROLE" | "RISCO_EXISTENTE";

export const CONCLUSOES: Record<
  Conclusao,
  { rotulo: string; encaminhamento: string; tom: "sucesso" | "atencao" | "perigo" }
> = {
  SEM_RISCO: { rotulo: "Sem risco indicado", encaminhamento: "Sem inclusão automática", tom: "sucesso" },
  CONTROLE: {
    rotulo: "Percepção de perigos com controle existente",
    encaminhamento: "Acompanhar e manter controle",
    tom: "atencao",
  },
  RISCO_EXISTENTE: { rotulo: "Risco existente", encaminhamento: "Plano de ação + inclusão no PGR", tom: "perigo" },
};

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
