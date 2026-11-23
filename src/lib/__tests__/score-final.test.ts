import { describe, expect, it } from "vitest";
import {
  arredondar2,
  calcularRiscoFinal,
  formatarMultiplicador,
  media2,
  textoEixoSetor,
  concluir,
  efeitosEmPontos,
  formatarEfeito,
  formatarRisco,
} from "@/lib/score-final";

describe("calcularRiscoFinal = Eixo 1 × Eixo 2 × Eixo 3", () => {
  it("exemplo do plano: 3,80 × 0,90 × 1,10 = 3,76 → controle", () => {
    const r = calcularRiscoFinal(3.8, 0.9, 1.1);
    // 2 casas em cada etapa (decisão da cliente, nov/2026): 3,762 → 3,76.
    expect(r).toBe(3.76);
    expect(concluir(r)).toBe("CONTROLE");
  });

  it("a conta fecha com os números exibidos: 3,82 × 0,80 = 3,06 (antes saía 3,05 com o Eixo 1 sem arredondar)", () => {
    expect(calcularRiscoFinal(3.8167, 0.8, 1)).toBe(3.06);
    expect(calcularRiscoFinal(3.82, 0.8, 1)).toBe(3.06);
  });

  it("arredondamento comercial sem erro de ponto flutuante", () => {
    expect(arredondar2(1.005)).toBe(1.01);
    expect(arredondar2(2.675)).toBe(2.68);
    expect(arredondar2(3.0549)).toBe(3.05);
    expect(media2([1.8, 1.81])).toBe(1.81);
    expect(media2([])).toBeNull();
  });

  it("multiplicador do setor e efeito em pontos", () => {
    expect(formatarMultiplicador(0.8114)).toBe("×0,81");
    expect(formatarMultiplicador(null)).toBe("—");
    expect(textoEixoSetor(0.81, -0.42)).toBe("×0,81 (−0,42)");
    expect(textoEixoSetor(null, null)).toBe("não entrou (×1,00)");
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
