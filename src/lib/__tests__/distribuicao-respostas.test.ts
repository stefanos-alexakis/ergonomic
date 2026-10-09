import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { distribuir, estaExposto, temDestaque, type PerguntaCatalogo } from "@/lib/distribuicao-respostas";
import { nomeDeAba } from "@/lib/distribuicao-excel";

const p = (id: string, numero: number, fatorId: string, fatorNome: string, extra: Partial<PerguntaCatalogo> = {}): PerguntaCatalogo => ({
  id,
  numero,
  texto: `Pergunta ${numero}`,
  polaridade: "MAIOR_PIOR",
  peso: 1,
  fatorId,
  fatorNome,
  ...extra,
});

describe("temDestaque — 50% ou mais de expostos", () => {
  it.each([
    [5, 10, true], // exatamente 50%
    [4, 10, false],
    [6, 11, true], // 54,5%
    [5, 11, false], // 45,5%
    [0, 0, false],
  ])("%i de %i expostos → %s", (expostos, n, esperado) => {
    expect(temDestaque(expostos, n)).toBe(esperado);
  });
});

describe("estaExposto — Frequentemente (4) ou Sempre (5) na escala de risco", () => {
  it("pergunta negativa: 4 e 5 expõem; 3 (às vezes) não", () => {
    expect(estaExposto(5, "MAIOR_PIOR")).toBe(true);
    expect(estaExposto(4, "MAIOR_PIOR")).toBe(true);
    expect(estaExposto(3, "MAIOR_PIOR")).toBe(false);
  });
  it("pergunta positiva é invertida: 1 e 2 expõem", () => {
    expect(estaExposto(1, "MAIOR_MELHOR")).toBe(true);
    expect(estaExposto(5, "MAIOR_MELHOR")).toBe(false);
  });
});

describe("distribuir", () => {
  const perguntas = [p("a", 2, "f2", "2. Demandas"), p("b", 1, "f1", "1. Instrução"), p("c", 3, "f1", "1. Instrução")];

  it("conta cada opção, agrupa por fator (1–13) e ordena as perguntas pelo número", () => {
    const respostas = [
      { itens: [{ perguntaId: "a", valor: 5 }, { perguntaId: "b", valor: 1 }, { perguntaId: "c", valor: 3 }] },
      { itens: [{ perguntaId: "a", valor: 4 }, { perguntaId: "b", valor: 1 }, { perguntaId: "c", valor: 3 }] },
      { itens: [{ perguntaId: "a", valor: 3 }, { perguntaId: "b", valor: 2 }] }, // sem resposta à "c"
      { itens: [{ perguntaId: "a", valor: 9 }] }, // valor inválido é ignorado
    ];
    const fatores = distribuir(perguntas, respostas);
    expect(fatores.map((f) => f.nome)).toEqual(["1. Instrução", "2. Demandas"]);
    expect(fatores[0]!.linhas.map((l) => l.pergunta.numero)).toEqual([1, 3]);

    const a = fatores[1]!.linhas[0]!;
    expect(a.contagem).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
    expect(a.n).toBe(3);
    expect(a.expostos).toBe(2);
    expect(a.destaque).toBe(true);
    expect(fatores[1]!.indice).toBeCloseTo(4);

    const c = fatores[0]!.linhas[1]!;
    expect(c.n).toBe(2); // quem não respondeu não entra no total da pergunta
    expect(c.destaque).toBe(false); // "às vezes" não é exposição pela metodologia
  });

  it("pergunta sem nenhuma resposta: n 0, sem % e sem destaque", () => {
    const [f] = distribuir([p("x", 1, "f1", "1. Instrução")], []);
    expect(f!.linhas[0]).toMatchObject({ n: 0, parcelaExpostos: null, destaque: false });
    expect(f!.indice).toBeNull();
  });
});

describe("nomeDeAba (Excel)", () => {
  it("remove caracteres proibidos, corta em 31 e evita repetidos", () => {
    const usados = new Set<string>();
    expect(nomeDeAba("Produção/Montagem [A]: turno?", usados)).toBe("Produção-Montagem -A-- turno-");
    expect(nomeDeAba("x".repeat(40), usados)).toHaveLength(31);
    expect(nomeDeAba("Todos", usados)).toBe("Todos");
    expect(nomeDeAba("todos", usados)).toBe("todos 2");
  });
});
