import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  resolverAvaliacao: vi.fn(),
  sinalFindUnique: vi.fn(),
  respostaDeleteMany: vi.fn(),
  respostaUpsert: vi.fn(),
  avaliacaoUpdate: vi.fn(),
}));

vi.mock("@/lib/avaliacao-eixo2", () => ({ resolverAvaliacao: m.resolverAvaliacao }));
vi.mock("@/lib/db", () => ({
  db: {
    sinalEixo2: { findUnique: m.sinalFindUnique },
    respostaSinalEixo2: { deleteMany: m.respostaDeleteMany, upsert: m.respostaUpsert },
    avaliacaoEixo2: { update: m.avaliacaoUpdate },
  },
}));

import {
  ESCALA_SINAIS,
  confirmarRevisaoSinais,
  ehValorSinal,
  rotuloSinal,
  salvarSinal,
} from "@/lib/sinais-eixo2";

const avaliacao = (extra: object = {}) => ({
  id: "a1",
  status: "RASCUNHO",
  sinaisRevisadosEm: null,
  setores: [{ setorId: "s1" }, { setorId: "s2" }],
  ...extra,
});
const entrada = { sinalId: "sinal1", setorId: "s1", valor: 4 };

describe("escala dos sinais (ISO 45003)", () => {
  it("usa a mesma escala de 1 a 5 do Eixo 1", () => {
    expect(ESCALA_SINAIS.map((e) => e.valor)).toEqual([1, 2, 3, 4, 5]);
    expect(rotuloSinal(1)).toBe("Não/Nunca");
    expect(rotuloSinal(5)).toBe("Sempre");
  });

  it("só aceita inteiros de 1 a 5", () => {
    expect([1, 3, 5].every(ehValorSinal)).toBe(true);
    expect([0, 6, 2.5, NaN, "3", null, undefined].some(ehValorSinal)).toBe(false);
  });
});

describe("salvarSinal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.resolverAvaliacao.mockResolvedValue(avaliacao());
    m.sinalFindUnique.mockResolvedValue({ id: "sinal1" });
  });

  it("grava o valor identificado (2 a 5) para o setor", async () => {
    expect(await salvarSinal("a1", "w1", entrada)).toEqual({ ok: true });
    expect(m.respostaUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { avaliacaoId: "a1", sinalId: "sinal1", setorId: "s1", valor: 4 } }),
    );
  });

  it("'Nunca' volta ao padrão: apaga a linha em vez de gravar", async () => {
    expect(await salvarSinal("a1", "w1", { ...entrada, valor: 1 })).toEqual({ ok: true });
    expect(m.respostaDeleteMany).toHaveBeenCalledWith({
      where: { avaliacaoId: "a1", sinalId: "sinal1", setorId: "s1" },
    });
    expect(m.respostaUpsert).not.toHaveBeenCalled();
  });

  it("recusa valor fora da escala", async () => {
    expect((await salvarSinal("a1", "w1", { ...entrada, valor: 7 })).ok).toBe(false);
    expect(m.respostaUpsert).not.toHaveBeenCalled();
  });

  it("recusa setor que não é da avaliação", async () => {
    const r = await salvarSinal("a1", "w1", { ...entrada, setorId: "de-outra-empresa" });
    expect(r).toEqual({ ok: false, erro: "Setor fora desta avaliação." });
    expect(m.respostaUpsert).not.toHaveBeenCalled();
  });

  it("recusa avaliação de outra empresa (não resolvida) e sinal inexistente", async () => {
    m.resolverAvaliacao.mockResolvedValue(null);
    expect((await salvarSinal("a1", "w-outra", entrada)).ok).toBe(false);
    m.resolverAvaliacao.mockResolvedValue(avaliacao());
    m.sinalFindUnique.mockResolvedValue(null);
    expect(await salvarSinal("a1", "w1", entrada)).toEqual({ ok: false, erro: "Sinal inválido." });
  });

  it("avaliação concluída é somente leitura", async () => {
    m.resolverAvaliacao.mockResolvedValue(avaliacao({ status: "CONCLUIDA" }));
    expect((await salvarSinal("a1", "w1", entrada)).ok).toBe(false);
    expect(m.respostaUpsert).not.toHaveBeenCalled();
  });
});

describe("confirmarRevisaoSinais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.resolverAvaliacao.mockResolvedValue(avaliacao());
  });

  it("marca a revisão na primeira confirmação", async () => {
    expect(await confirmarRevisaoSinais("a1", "w1")).toEqual({ ok: true });
    expect(m.avaliacaoUpdate).toHaveBeenCalledOnce();
  });

  it("é idempotente: confirmar de novo não muda a data", async () => {
    m.resolverAvaliacao.mockResolvedValue(avaliacao({ sinaisRevisadosEm: new Date() }));
    expect(await confirmarRevisaoSinais("a1", "w1")).toEqual({ ok: true });
    expect(m.avaliacaoUpdate).not.toHaveBeenCalled();
  });

  it("recusa avaliação de outra empresa", async () => {
    m.resolverAvaliacao.mockResolvedValue(null);
    expect((await confirmarRevisaoSinais("a1", "w-outra")).ok).toBe(false);
  });
});
