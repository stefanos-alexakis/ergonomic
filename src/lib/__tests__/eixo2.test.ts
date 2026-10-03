import { describe, expect, it } from "vitest";
import {
  calcularFatorEixo2,
  classificarFatorEixo2,
  formatarFator,
  indiceControle,
  VALOR_CONDICAO,
} from "@/lib/eixo2";

describe("valores das medidas (metodologia FRPRT §4)", () => {
  it("eficaz e N.A. valem 0,80; precisa melhorar 0,90; inexistente 1,00", () => {
    expect(VALOR_CONDICAO).toEqual({ EFICAZ: 0.8, NAO_SE_APLICA: 0.8, PRECISA_MELHORAR: 0.9, INEXISTENTE: 1 });
  });
});

describe("calcularFatorEixo2", () => {
  it("reproduz o exemplo oficial: Liderança com 4 eficazes e 1 precisa melhorar = 0,82", () => {
    const fator = calcularFatorEixo2([
      { condicao: "EFICAZ" },
      { condicao: "EFICAZ" },
      { condicao: "EFICAZ" },
      { condicao: "EFICAZ" },
      { condicao: "PRECISA_MELHORAR" },
    ]);
    expect(fator).toBeCloseTo(0.82, 10);
  });

  it("N.A. conta como eficaz, não como deficiência de controle", () => {
    expect(calcularFatorEixo2([{ condicao: "NAO_SE_APLICA" }, { condicao: "EFICAZ" }])).toBeCloseTo(0.8, 10);
  });

  it("peso maior puxa o fator para a medida mais importante", () => {
    const fator = calcularFatorEixo2([
      { condicao: "EFICAZ", peso: 1 },
      { condicao: "INEXISTENTE", peso: 3 },
    ]);
    // (0,80 + 3 × 1,00) ÷ 4 = 0,95
    expect(fator).toBeCloseTo(0.95, 10);
  });

  it("sem medidas respondidas devolve null, nunca NaN", () => {
    expect(calcularFatorEixo2([])).toBeNull();
  });
});

describe("classificarFatorEixo2 — Bom ≤ 0,85 < Regular ≤ 0,95 < Ruim", () => {
  it("tudo eficaz é Bom; 0,85 exato ainda é Bom", () => {
    expect(classificarFatorEixo2(0.8).classe).toBe("BOM");
    expect(classificarFatorEixo2(0.85).classe).toBe("BOM");
    // 0,85 vindo de conta com ponto flutuante não pode escorregar de faixa
    expect(classificarFatorEixo2((0.8 + 0.9) / 2).classe).toBe("BOM");
  });

  it("acima de 0,85 até 0,95 é Regular", () => {
    expect(classificarFatorEixo2(0.86).classe).toBe("REGULAR");
    expect(classificarFatorEixo2(0.95).classe).toBe("REGULAR");
  });

  it("acima de 0,95 é Ruim", () => {
    expect(classificarFatorEixo2(0.96).classe).toBe("RUIM");
    expect(classificarFatorEixo2(1).classe).toBe("RUIM");
  });
});

describe("indiceControle", () => {
  it("0,80 = 100 %, 0,90 = 50 %, 1,00 = 0 %", () => {
    expect(indiceControle(0.8)).toBe(100);
    expect(indiceControle(0.9)).toBe(50);
    expect(indiceControle(1)).toBe(0);
    expect(indiceControle(0.82)).toBe(90);
  });
});

describe("formatarFator", () => {
  it("usa vírgula e o sinal de multiplicação", () => {
    expect(formatarFator(0.82)).toBe("×0,82");
  });
});
