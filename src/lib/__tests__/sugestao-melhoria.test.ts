import { describe, expect, it } from "vitest";
import { LIMITE_SUGESTAO, normalizarSugestao, primeiraPaginaPendente } from "../sugestao-melhoria";
import { montarPaginas } from "../paginacao-questionario";

describe("normalizarSugestao", () => {
  it("vazio ou só espaços vira sem resposta (a pergunta é opcional)", () => {
    expect(normalizarSugestao("")).toEqual({ ok: true, texto: null });
    expect(normalizarSugestao("  \n \r\n ")).toEqual({ ok: true, texto: null });
    expect(normalizarSugestao(null)).toEqual({ ok: true, texto: null });
  });

  it("tira espaços das pontas e unifica quebras de linha", () => {
    expect(normalizarSugestao("  mais pausas\r\nmais gente \r")).toEqual({ ok: true, texto: "mais pausas\nmais gente" });
  });

  it("aceita o texto no limite e recusa acima dele", () => {
    expect(normalizarSugestao("a".repeat(LIMITE_SUGESTAO)).ok).toBe(true);
    const r = normalizarSugestao("a".repeat(LIMITE_SUGESTAO + 1));
    expect(r.ok).toBe(false);
  });
});

describe("primeiraPaginaPendente", () => {
  const perguntas = Array.from({ length: 10 }, (_, i) => ({ id: `p${i + 1}`, texto: "x", ordemGlobal: i + 1 }));
  const paginas = montarPaginas([{ blocoId: "b", blocoNome: "B", perguntas }], 4); // 4 + 4 + 2

  it("devolve null quando tudo foi respondido", () => {
    expect(primeiraPaginaPendente(paginas, new Map(perguntas.map((p) => [p.id, 3])))).toBeNull();
  });

  it("devolve a primeira página com pergunta sem resposta", () => {
    const respondidas = new Map(perguntas.filter((p) => p.id !== "p6").map((p) => [p.id, 3]));
    expect(primeiraPaginaPendente(paginas, respondidas)).toBe(2);
    expect(primeiraPaginaPendente(paginas, new Map())).toBe(1);
  });
});
