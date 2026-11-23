import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ pesquisaFindMany: vi.fn(), groupBy: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { pesquisa: { findMany: m.pesquisaFindMany }, codigoAcesso: { groupBy: m.groupBy } },
}));

import { listarRelatoriosEixo1 } from "@/lib/relatorios-eixo1";
import { painelDisponivel, rotuloRespostas } from "@/lib/relatorios-eixo1-util";

describe("painelDisponivel", () => {
  it("só com respostas concluídas no mínimo exigido pela pesquisa", () => {
    expect(painelDisponivel(2, 3)).toBe(false);
    expect(painelDisponivel(3, 3)).toBe(true);
    expect(painelDisponivel(0, 5)).toBe(false);
    expect(painelDisponivel(7, 5)).toBe(true);
  });
});

describe("rotuloRespostas", () => {
  it("mostra 'n de total' quando há códigos", () => {
    expect(rotuloRespostas(18, 25)).toBe("18 de 25");
    expect(rotuloRespostas(0, 0)).toBe("0");
  });
});

describe("listarRelatoriosEixo1", () => {
  const base = { dataInicio: new Date("2026-03-01"), dataFim: new Date("2026-03-31"), arquivadaEm: null, exclusaoSolicitadaEm: null };
  beforeEach(() => vi.clearAllMocks());

  it("filtra pela empresa e deixa de fora arquivadas e com exclusão solicitada", async () => {
    m.pesquisaFindMany.mockResolvedValue([]);
    await listarRelatoriosEixo1("w-da-sessao");
    expect(m.pesquisaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "w-da-sessao", arquivadaEm: null, exclusaoSolicitadaEm: null } }),
    );
    expect(m.groupBy).not.toHaveBeenCalled();
  });

  it("conta só participantes e marca sem link quem não atingiu o mínimo", async () => {
    m.pesquisaFindMany.mockResolvedValue([
      { id: "p1", nome: "Com painel", limiteSupressaoGrupo: 3, ...base },
      { id: "p2", nome: "Aguardando", limiteSupressaoGrupo: 3, ...base },
      { id: "p3", nome: "Sem códigos", limiteSupressaoGrupo: 3, ...base },
    ]);
    m.groupBy
      .mockResolvedValueOnce([
        { pesquisaId: "p1", _count: { _all: 25 } },
        { pesquisaId: "p2", _count: { _all: 10 } },
      ])
      .mockResolvedValueOnce([
        { pesquisaId: "p1", _count: { _all: 18 } },
        { pesquisaId: "p2", _count: { _all: 2 } },
      ]);
    const r = await listarRelatoriosEixo1("w1");
    expect(r.map((x) => [x.nome, x.codigos, x.concluidas, x.painelDisponivel])).toEqual([
      ["Com painel", 25, 18, true],
      ["Aguardando", 10, 2, false],
      ["Sem códigos", 0, 0, false],
    ]);
    // Os dois agrupamentos só olham códigos de participante (teste não conta).
    for (const [arg] of m.groupBy.mock.calls) expect(arg.where.tipo).toBe("PARTICIPANTE");
  });
});
