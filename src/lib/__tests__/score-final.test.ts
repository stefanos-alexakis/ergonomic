import { describe, expect, it } from "vitest";
import { calcularScoreBase } from "@/lib/dashboard";
import {
  calcularRiscoFinal,
  concluir,
  efeitosEmPontos,
  formatarEfeito,
  formatarRisco,
  notaDoRisco,
} from "@/lib/score-final";

describe("calcularRiscoFinal = Eixo 1 × Eixo 2 × Eixo 3", () => {
  it("exemplo do plano: 3,80 × 0,90 × 1,10 = 3,76 → controle, nota 317", () => {
    const r = calcularRiscoFinal(3.8, 0.9, 1.1);
    expect(r).toBeCloseTo(3.762, 10);
    expect(concluir(r)).toBe("CONTROLE");
    expect(notaDoRisco(r)).toBe(317);
  });

  it("exemplo da matriz da cliente (PDF): Gestão de Mudanças 4,40 × 0,90 × 1,10 = 4,36 → risco existente", () => {
    const r = calcularRiscoFinal(4.4, 0.9, 1.1);
    expect(formatarRisco(r)).toBe("4,36");
    expect(concluir(r)).toBe("RISCO_EXISTENTE");
  });
});

describe("concluir — cortes da metodologia", () => {
  it("até 3,00 sem risco; até 4,00 controle; acima de 4,00 risco existente", () => {
    expect(concluir(3)).toBe("SEM_RISCO");
    expect(concluir(3.01)).toBe("CONTROLE");
    expect(concluir(4)).toBe("CONTROLE");
    expect(concluir(4.01)).toBe("RISCO_EXISTENTE");
  });
  it("3,00 vindo de conta com ponto flutuante não escorrega de faixa", () => {
    expect(concluir(3.75 * 0.8)).toBe("SEM_RISCO");
  });
});

describe("notaDoRisco — mesma régua do Score Base", () => {
  it("sem Eixos 2 e 3, nota final = Score Base do Eixo 1", () => {
    for (const media of [1, 2.2, 3, 4.6, 5]) expect(notaDoRisco(media)).toBe(calcularScoreBase(media));
  });
  it("Eixo 2 eficaz pode passar de 800; Eixo 3 agravando trava no piso de 100", () => {
    expect(notaDoRisco(0.8)).toBe(835);
    expect(notaDoRisco(5.5)).toBe(100);
  });
});

describe("efeitosEmPontos", () => {
  it("decompõe o resultado multiplicativo em pontos, como a imagem de referência", () => {
    const e = efeitosEmPontos(3.8, 0.9, 1.1);
    expect(e.efeitoEixo2).toBeCloseTo(-0.38, 10);
    expect(e.efeitoEixo3).toBeCloseTo(0.342, 10);
    expect(3.8 + e.efeitoEixo2 + e.efeitoEixo3).toBeCloseTo(e.final, 10);
    expect(formatarEfeito(e.efeitoEixo2)).toBe("−0,38");
    expect(formatarEfeito(e.efeitoEixo3)).toBe("+0,34");
    expect(formatarEfeito(0)).toBe("0,00");
  });
});
