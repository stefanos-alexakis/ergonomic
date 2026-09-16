import { describe, expect, it } from "vitest";
import { montarPaginas, type BlocoComPerguntas } from "@/lib/paginacao-questionario";

function perguntas(n: number, prefixo: string) {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefixo}-${i}`,
    texto: `Pergunta ${i}`,
    ordemGlobal: i,
  }));
}

describe("montarPaginas (spec.md §6 — nunca mistura blocos na mesma página)", () => {
  it("com os tamanhos reais (25 + 17) e página de 7, gera 7 páginas sem misturar bloco", () => {
    const blocos: BlocoComPerguntas[] = [
      { blocoId: "b1", blocoNome: "Bloco 1", perguntas: perguntas(25, "b1") },
      { blocoId: "b2", blocoNome: "Bloco 2", perguntas: perguntas(17, "b2") },
    ];
    const paginas = montarPaginas(blocos, 7);

    expect(paginas).toHaveLength(7); // ceil(25/7)=4 + ceil(17/7)=3
    for (const p of paginas) {
      expect(p.perguntas.every((q) => q.id.startsWith(p.blocoId))).toBe(true);
    }
    // números de página sequenciais, sem furo
    expect(paginas.map((p) => p.numeroPagina)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // soma de perguntas confere com o total
    const total = paginas.reduce((acc, p) => acc + p.perguntas.length, 0);
    expect(total).toBe(42);
    // última página do bloco 1 tem o resto (25 - 3*7 = 4)
    expect(paginas[3]?.perguntas).toHaveLength(4);
    // última página do bloco 2 tem o resto (17 - 2*7 = 3)
    expect(paginas[6]?.perguntas).toHaveLength(3);
  });

  it("bloco menor que uma página gera só uma página para ele", () => {
    const blocos: BlocoComPerguntas[] = [{ blocoId: "b1", blocoNome: "Único", perguntas: perguntas(3, "b1") }];
    const paginas = montarPaginas(blocos, 7);
    expect(paginas).toHaveLength(1);
    expect(paginas[0]?.perguntas).toHaveLength(3);
  });
});
