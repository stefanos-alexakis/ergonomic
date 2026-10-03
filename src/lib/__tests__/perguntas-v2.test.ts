import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Integridade do arquivo que alimenta o questionário v2 (revisão da
 * cliente, 35 perguntas). O seed também valida a contagem, mas falha só na
 * hora de rodar contra um banco — aqui o erro aparece no `vitest run`.
 */

type PerguntaSeed = {
  ordemGlobal: number;
  bloco: string;
  dimensao: string;
  fatorRisco: string;
  situacaoInvestigada: string;
  texto: string;
  exemplo: string | null;
};

const perguntas = JSON.parse(
  readFileSync(join(process.cwd(), "prisma", "seed-data", "perguntas-v2.json"), "utf-8"),
) as PerguntaSeed[];

describe("perguntas-v2.json (Eixo 1 revisado)", () => {
  it("tem 35 perguntas: 21 no Bloco 1 e 14 no Bloco 2", () => {
    expect(perguntas).toHaveLength(35);
    expect(perguntas.filter((p) => p.bloco.startsWith("BLOCO 1"))).toHaveLength(21);
    expect(perguntas.filter((p) => p.bloco.startsWith("BLOCO 2"))).toHaveLength(14);
  });

  it("numera de 1 a 35, em sequência e sem repetir", () => {
    expect(perguntas.map((p) => p.ordemGlobal)).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
  });

  it("toda pergunta tem dimensão, fator, situação e texto preenchidos", () => {
    for (const p of perguntas) {
      expect(p.dimensao.trim()).not.toBe("");
      expect(p.fatorRisco.trim()).not.toBe("");
      expect(p.situacaoInvestigada.trim()).not.toBe("");
      expect(p.texto.trim()).not.toBe("");
    }
  });

  it("separa o 'Exemplo' do texto da pergunta (11 perguntas têm exemplo)", () => {
    const comExemplo = perguntas.filter((p) => p.exemplo);
    expect(comExemplo).toHaveLength(11);
    for (const p of perguntas) {
      expect(p.texto).not.toMatch(/Exemplo:/i);
      if (p.exemplo) expect(p.exemplo).not.toMatch(/^Exemplo:/i);
    }
  });

  it("segue as dimensões do documento (10 dimensões, sem 4, 7 e 12)", () => {
    const dimensoes = [...new Set(perguntas.map((p) => p.dimensao))];
    expect(dimensoes).toEqual([
      "1.Instrução de trabalho",
      "2. Demandas de Trabalho",
      "3. Controle e Autonomia",
      "5. Horários e Jornada",
      "6. Segurança e Mudanças",
      "8. Relações Interpessoais",
      "9. Liderança",
      "10. Equilíbrio Trabalho-Vida",
      "11. Violência no Trabalho",
      "13. Trabalho Isolado ou Remoto",
    ]);
  });

  it("une reconhecimento e feedback numa única pergunta, como no documento", () => {
    const retorno = perguntas.filter((p) => p.situacaoInvestigada.includes("Falta de reconhecimento"));
    expect(retorno).toHaveLength(1);
    expect(retorno[0]?.situacaoInvestigada).toContain("Falta de feedback construtivo");
  });
});
