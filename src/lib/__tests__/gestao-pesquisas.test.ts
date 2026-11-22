import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  resolvePesquisaDoWorkspace: vi.fn(),
  codigoCount: vi.fn(),
  pesquisaUpdate: vi.fn(),
  pesquisaDelete: vi.fn(),
  respostaDeleteMany: vi.fn(),
  codigoDeleteMany: vi.fn(),
  prePesquisaDeleteMany: vi.fn(),
  rascunhoUpdateMany: vi.fn(),
}));

vi.mock("@/lib/pesquisa", () => ({ resolvePesquisaDoWorkspace: m.resolvePesquisaDoWorkspace }));
vi.mock("@/lib/db", () => {
  const tx = {
    respostaPrePesquisa: { deleteMany: m.prePesquisaDeleteMany },
    resposta: { deleteMany: m.respostaDeleteMany },
    codigoAcesso: { deleteMany: m.codigoDeleteMany },
    relatorioRascunho: { updateMany: m.rascunhoUpdateMany },
    pesquisa: { delete: m.pesquisaDelete },
  };
  return {
    db: {
      codigoAcesso: { count: m.codigoCount },
      pesquisa: { update: m.pesquisaUpdate },
      $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
    },
  };
});

import {
  alterarEncerramento,
  arquivarPesquisa,
  desarquivarPesquisa,
  excluirDefinitivamente,
  excluirPesquisaNaoIniciada,
  nomeConfere,
  solicitarExclusao,
} from "@/lib/gestao-pesquisas";

const DIA = 24 * 60 * 60 * 1000;
const pesquisa = (extra: object = {}) => ({
  id: "p1",
  nome: "Diagnóstico 2026",
  dataInicio: new Date("2026-03-01T09:00:00"),
  dataFim: new Date("2026-03-31T18:00:00"),
  arquivadaEm: null,
  exclusaoSolicitadaEm: null,
  ...extra,
});

describe("gestão de pesquisas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.resolvePesquisaDoWorkspace.mockResolvedValue(pesquisa());
    m.codigoCount.mockResolvedValue(0); // não iniciada
  });

  it("nome conferido ignora caixa e espaços nas pontas", () => {
    expect(nomeConfere("  diagnóstico 2026 ", "Diagnóstico 2026")).toBe(true);
    expect(nomeConfere("Diagnostico 2026", "Diagnóstico 2026")).toBe(false);
  });

  it("pesquisa de outra empresa (não resolvida) nunca é tocada", async () => {
    m.resolvePesquisaDoWorkspace.mockResolvedValue(null);
    const novo = new Date("2026-05-01T18:00:00");
    for (const r of [
      await alterarEncerramento("p1", "w-outra", novo),
      await arquivarPesquisa("p1", "w-outra"),
      await excluirPesquisaNaoIniciada("p1", "w-outra"),
      await solicitarExclusao("p1", "w-outra", "Diagnóstico 2026"),
    ]) {
      expect(r).toEqual({ ok: false, erro: "Pesquisa não encontrada." });
    }
    expect(m.pesquisaUpdate).not.toHaveBeenCalled();
    expect(m.pesquisaDelete).not.toHaveBeenCalled();
  });

  describe("encerramento", () => {
    it("prorroga (e antecipa, se nada começou)", async () => {
      expect(await alterarEncerramento("p1", "w1", new Date("2026-04-30T18:00:00"))).toEqual({ ok: true });
      expect(await alterarEncerramento("p1", "w1", new Date("2026-03-10T18:00:00"))).toEqual({ ok: true });
      expect(m.pesquisaUpdate).toHaveBeenCalledTimes(2);
    });

    it("depois de iniciada, recusa antecipar mas aceita prorrogar", async () => {
      m.codigoCount.mockResolvedValue(2);
      expect((await alterarEncerramento("p1", "w1", new Date("2026-03-10T18:00:00"))).ok).toBe(false);
      expect(await alterarEncerramento("p1", "w1", new Date("2026-04-30T18:00:00"))).toEqual({ ok: true });
      expect(m.pesquisaUpdate).toHaveBeenCalledTimes(1);
    });

    it("recusa data antes do início e data inválida", async () => {
      expect((await alterarEncerramento("p1", "w1", new Date("2026-02-01T18:00:00"))).ok).toBe(false);
      expect((await alterarEncerramento("p1", "w1", new Date("lixo"))).ok).toBe(false);
      expect(m.pesquisaUpdate).not.toHaveBeenCalled();
    });

    it("pesquisa arquivada precisa ser desarquivada antes", async () => {
      m.resolvePesquisaDoWorkspace.mockResolvedValue(pesquisa({ arquivadaEm: new Date() }));
      expect((await alterarEncerramento("p1", "w1", new Date("2026-05-01T18:00:00"))).ok).toBe(false);
    });
  });

  describe("arquivar", () => {
    it("arquiva e desarquiva", async () => {
      expect(await arquivarPesquisa("p1", "w1")).toEqual({ ok: true });
      expect(m.pesquisaUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { arquivadaEm: expect.any(Date) } }));
      m.resolvePesquisaDoWorkspace.mockResolvedValue(pesquisa({ arquivadaEm: new Date() }));
      expect(await desarquivarPesquisa("p1", "w1")).toEqual({ ok: true });
    });

    it("não desarquiva com pedido de exclusão em andamento", async () => {
      m.resolvePesquisaDoWorkspace.mockResolvedValue(
        pesquisa({ arquivadaEm: new Date(), exclusaoSolicitadaEm: new Date() }),
      );
      expect((await desarquivarPesquisa("p1", "w1")).ok).toBe(false);
      expect(m.pesquisaUpdate).not.toHaveBeenCalled();
    });
  });

  describe("exclusão direta (não iniciada)", () => {
    it("apaga tudo na ordem certa, só os códigos de teste não contam como início", async () => {
      expect(await excluirPesquisaNaoIniciada("p1", "w1")).toEqual({ ok: true });
      // a consulta de "iniciada" só olha códigos de PARTICIPANTE
      expect(m.codigoCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tipo: "PARTICIPANTE" }) }),
      );
      expect(m.pesquisaDelete).toHaveBeenCalledWith({ where: { id: "p1" } });
      expect(m.rascunhoUpdateMany).toHaveBeenCalledWith({ where: { pesquisaId: "p1" }, data: { pesquisaId: null } });
      const ordem = [m.respostaDeleteMany, m.codigoDeleteMany, m.pesquisaDelete].map((f) => f.mock.invocationCallOrder[0]!);
      expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    });

    it("recusa pesquisa já iniciada", async () => {
      m.codigoCount.mockResolvedValue(1);
      expect((await excluirPesquisaNaoIniciada("p1", "w1")).ok).toBe(false);
      expect(m.pesquisaDelete).not.toHaveBeenCalled();
    });
  });

  describe("exclusão de pesquisa iniciada (30 dias)", () => {
    beforeEach(() => m.codigoCount.mockResolvedValue(3));

    it("o pedido exige o nome digitado e arquiva sem apagar nada", async () => {
      expect((await solicitarExclusao("p1", "w1", "outro nome")).ok).toBe(false);
      expect(m.pesquisaUpdate).not.toHaveBeenCalled();
      expect(await solicitarExclusao("p1", "w1", "Diagnóstico 2026")).toEqual({ ok: true });
      expect(m.pesquisaUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { exclusaoSolicitadaEm: expect.any(Date), arquivadaEm: expect.any(Date) } }),
      );
      expect(m.pesquisaDelete).not.toHaveBeenCalled();
    });

    it("pedir de novo não reinicia a contagem dos 30 dias", async () => {
      m.resolvePesquisaDoWorkspace.mockResolvedValue(
        pesquisa({ arquivadaEm: new Date(), exclusaoSolicitadaEm: new Date(Date.now() - 5 * DIA) }),
      );
      expect(await solicitarExclusao("p1", "w1", "Diagnóstico 2026")).toEqual({ ok: true });
      expect(m.pesquisaUpdate).not.toHaveBeenCalled();
    });

    it("pesquisa não iniciada não passa pelo pedido: é exclusão direta", async () => {
      m.codigoCount.mockResolvedValue(0);
      expect((await solicitarExclusao("p1", "w1", "Diagnóstico 2026")).ok).toBe(false);
    });

    it("a exclusão definitiva só vale com pedido, depois de 30 dias e com o nome de novo", async () => {
      const agora = new Date("2026-06-01T12:00:00");
      // sem pedido
      expect((await excluirDefinitivamente("p1", "w1", "Diagnóstico 2026", agora)).ok).toBe(false);
      // 29 dias depois do pedido
      m.resolvePesquisaDoWorkspace.mockResolvedValue(
        pesquisa({ arquivadaEm: agora, exclusaoSolicitadaEm: new Date(agora.getTime() - 29 * DIA) }),
      );
      expect((await excluirDefinitivamente("p1", "w1", "Diagnóstico 2026", agora)).ok).toBe(false);
      // 30 dias depois, mas nome errado
      m.resolvePesquisaDoWorkspace.mockResolvedValue(
        pesquisa({ arquivadaEm: agora, exclusaoSolicitadaEm: new Date(agora.getTime() - 30 * DIA) }),
      );
      expect((await excluirDefinitivamente("p1", "w1", "errado", agora)).ok).toBe(false);
      expect(m.pesquisaDelete).not.toHaveBeenCalled();
      // 30 dias depois e nome certo
      expect(await excluirDefinitivamente("p1", "w1", "diagnóstico 2026", agora)).toEqual({ ok: true });
      expect(m.pesquisaDelete).toHaveBeenCalledOnce();
    });
  });
});
