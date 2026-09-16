import { describe, expect, it } from "vitest";
import { agruparEResumir, calcularMedia, normalizarValor } from "@/lib/dashboard";

describe("normalizarValor", () => {
  it("mantém o valor quando maior = pior (as 42 perguntas atuais)", () => {
    expect(normalizarValor(5, "MAIOR_PIOR")).toBe(5);
    expect(normalizarValor(1, "MAIOR_PIOR")).toBe(1);
  });

  it("inverte o valor quando maior = melhor (data-model.md — pergunta futura de sentido invertido)", () => {
    expect(normalizarValor(5, "MAIOR_MELHOR")).toBe(1);
    expect(normalizarValor(1, "MAIOR_MELHOR")).toBe(5);
  });
});

describe("calcularMedia", () => {
  it("retorna null para lista vazia, nunca NaN (tasks.md Fase 6 — estados vazios)", () => {
    expect(calcularMedia([])).toBeNull();
  });

  it("calcula a média já normalizada, misturando polaridades diferentes", () => {
    const media = calcularMedia([
      { valor: 5, polaridade: "MAIOR_PIOR" }, // 5
      { valor: 5, polaridade: "MAIOR_MELHOR" }, // 1
    ]);
    expect(media).toBe(3);
  });
});

describe("agruparEResumir", () => {
  it("agrupa por nome e calcula total + média por grupo", () => {
    const r = agruparEResumir([
      { grupoNome: "Produção", media: 4 },
      { grupoNome: "Produção", media: 2 },
      { grupoNome: "Administrativo", media: 5 },
    ]);
    const producao = r.find((g) => g.nome === "Produção");
    expect(producao?.total).toBe(2);
    expect(producao?.mediaGeral).toBe(3);
    expect(r.find((g) => g.nome === "Administrativo")?.total).toBe(1);
  });
});
