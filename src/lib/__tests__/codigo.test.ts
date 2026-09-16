import { describe, expect, it } from "vitest";
import {
  calcularQuantidadeTeste,
  gerarLoteCodigosUnicos,
  normalizarCodigo,
} from "@/lib/codigo";

describe("normalizarCodigo", () => {
  it("remove espaços e hífens e converte para maiúsculas", () => {
    expect(normalizarCodigo("abc-123 45")).toBe("ABC12345");
  });
});

describe("calcularQuantidadeTeste", () => {
  it("arredonda 5% para cima", () => {
    expect(calcularQuantidadeTeste(100)).toBe(5);
    expect(calcularQuantidadeTeste(1)).toBe(1);
    expect(calcularQuantidadeTeste(21)).toBe(2); // 1.05 -> 2
  });
});

describe("gerarLoteCodigosUnicos", () => {
  it("gera exatamente a quantidade pedida, sem colisão com existentes", () => {
    const existentes = new Set(["AAAAAAAA", "BBBBBBBB"]);
    const lote = gerarLoteCodigosUnicos(105, existentes);
    expect(lote).toHaveLength(105);
    expect(new Set(lote).size).toBe(105); // sem duplicados entre si
    for (const c of lote) {
      expect(existentes.has(c)).toBe(false);
      expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("nunca usa caracteres ambíguos (0, O, 1, I, L)", () => {
    const lote = gerarLoteCodigosUnicos(50, new Set());
    for (const c of lote) {
      expect(c).not.toMatch(/[0O1IL]/);
    }
  });
});
