import { describe, expect, it } from "vitest";
import { concluir } from "@/lib/score-final";
import {
  agruparEResumir,
  calcularMedia,
  calcularNivelRisco,
  calcularScoreBase,
  compararPorNumeroDaDimensao,
  normalizarValor,
  SCORE_BASE_MAXIMO,
  SCORE_BASE_MINIMO,
} from "@/lib/dashboard";

describe("normalizarValor", () => {
  it("mantém o valor quando maior = pior (todas as perguntas atuais, v1 e v2)", () => {
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

describe("calcularScoreBase — Eixo 1 vale até 80% da pontuação, com piso de 100 (100–800 de 0–1000)", () => {
  it("média 1 (nunca — melhor cenário) dá o score máximo", () => {
    expect(calcularScoreBase(1)).toBe(SCORE_BASE_MAXIMO);
  });

  it("média 5 (sempre — pior cenário) trava no piso, nunca zera (senão um agravante do Eixo 3 não teria efeito)", () => {
    expect(calcularScoreBase(5)).toBe(SCORE_BASE_MINIMO);
    expect(calcularScoreBase(5)).toBe(100);
  });

  it("média 3 (às vezes) fica no meio do caminho entre o piso e o teto", () => {
    expect(calcularScoreBase(3)).toBe(SCORE_BASE_MINIMO + (SCORE_BASE_MAXIMO - SCORE_BASE_MINIMO) / 2);
  });
});

describe("calcularNivelRisco — mesma régua do Painel FRPRT (cortes 3,00 / 4,00 na média)", () => {
  it("média 1 (melhor cenário) é baixo risco", () => {
    expect(calcularNivelRisco(1)).toEqual({ rotulo: "Baixo risco", tom: "sucesso" });
  });

  it("média 3,00 exata ainda é baixo risco (nota 450)", () => {
    expect(calcularNivelRisco(3)).toEqual({ rotulo: "Baixo risco", tom: "sucesso" });
    expect(calcularScoreBase(3)).toBe(450);
  });

  it("média 3,01 já é médio risco", () => {
    expect(calcularNivelRisco(3.01)).toEqual({ rotulo: "Médio risco", tom: "atencao" });
  });

  it("média 4,00 exata ainda é médio risco (nota 275)", () => {
    expect(calcularNivelRisco(4)).toEqual({ rotulo: "Médio risco", tom: "atencao" });
    expect(calcularScoreBase(4)).toBe(275);
  });

  it("média 4,01 já é alto risco", () => {
    expect(calcularNivelRisco(4.01)).toEqual({ rotulo: "Alto risco", tom: "perigo" });
  });

  it("concorda com a conclusão do Painel FRPRT em toda a escala", () => {
    const tomPainel = { SEM_RISCO: "sucesso", CONTROLE: "atencao", RISCO_EXISTENTE: "perigo" } as const;
    for (let centesimos = 100; centesimos <= 500; centesimos++) {
      const media = centesimos / 100;
      expect(calcularNivelRisco(media).tom).toBe(tomPainel[concluir(media)]);
    }
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

describe("compararPorNumeroDaDimensao — painel do Eixo 1 em ordem de 1 a 13", () => {
  it("ordena pelo número do fator, não pela média nem alfabeticamente", () => {
    const nomes = [
      "7. Gestão de Mudanças",
      "10. Equilíbrio Trabalho-Vida",
      "1.Instrução de trabalho",
      "13. Trabalho Isolado ou Remoto",
      "2. Demandas de Trabalho",
    ];
    expect(nomes.map((nome) => ({ nome })).sort(compararPorNumeroDaDimensao).map((d) => d.nome)).toEqual([
      "1.Instrução de trabalho",
      "2. Demandas de Trabalho",
      "7. Gestão de Mudanças",
      "10. Equilíbrio Trabalho-Vida",
      "13. Trabalho Isolado ou Remoto",
    ]);
  });

  it("dimensão sem número vai para o fim", () => {
    const ordenado = [{ nome: "Outros" }, { nome: "3. Controle e Autonomia" }].sort(compararPorNumeroDaDimensao);
    expect(ordenado.map((d) => d.nome)).toEqual(["3. Controle e Autonomia", "Outros"]);
  });
});
