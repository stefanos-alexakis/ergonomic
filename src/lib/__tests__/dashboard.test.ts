import { describe, expect, it } from "vitest";
import { agruparEResumir, calcularMedia, calcularScoreBase, normalizarValor, SCORE_BASE_MAXIMO } from "@/lib/dashboard";

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

  it("sem peso informado, se comporta como média simples (peso 1 pra todas — retrocompatível)", () => {
    const media = calcularMedia([
      { valor: 1, polaridade: "MAIOR_PIOR" },
      { valor: 5, polaridade: "MAIOR_PIOR" },
    ]);
    expect(media).toBe(3);
  });

  it("pergunta com peso maior pesa mais na média (admin/perguntas — configurável pela Hozana)", () => {
    const media = calcularMedia([
      { valor: 1, polaridade: "MAIOR_PIOR", peso: 1 },
      { valor: 5, polaridade: "MAIOR_PIOR", peso: 3 }, // 3x mais influente
    ]);
    // (1*1 + 5*3) / (1+3) = 16/4 = 4 — puxado pra perto do valor de maior peso
    expect(media).toBe(4);
  });
});

describe("calcularScoreBase — Eixo 1 vale até 80% da pontuação (0–800 de 0–1000)", () => {
  it("média 1 (nunca — melhor cenário) dá o score máximo", () => {
    expect(calcularScoreBase(1)).toBe(SCORE_BASE_MAXIMO);
  });

  it("média 5 (sempre — pior cenário) dá score zero", () => {
    expect(calcularScoreBase(5)).toBe(0);
  });

  it("média 3 (às vezes) fica na metade do Score Base", () => {
    expect(calcularScoreBase(3)).toBe(SCORE_BASE_MAXIMO / 2);
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
