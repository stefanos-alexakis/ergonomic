import { describe, expect, it } from "vitest";
import {
  classificarPesquisa,
  exclusaoDefinitivaLiberada,
  exclusaoLiberadaEm,
  pesquisaAceitaAcesso,
  statusDaPesquisa,
  validarNovoEncerramento,
} from "@/lib/vigencia-pesquisa";

describe("pesquisaAceitaAcesso (spec.md §6, review.md §3.1)", () => {
  const pesquisa = { dataInicio: new Date("2026-03-01T09:00:00Z"), dataFim: new Date("2026-03-15T18:00:00Z") };

  it("bloqueia antes do início, mesmo para quem já teria código", () => {
    const agora = new Date("2026-02-28T23:59:00Z");
    expect(pesquisaAceitaAcesso(pesquisa, { jaIniciado: false, agora })).toBe(false);
    expect(pesquisaAceitaAcesso(pesquisa, { jaIniciado: true, agora })).toBe(false);
  });

  it("aceita durante o período normal", () => {
    const agora = new Date("2026-03-10T12:00:00Z");
    expect(pesquisaAceitaAcesso(pesquisa, { jaIniciado: false, agora })).toBe(true);
  });

  it("bloqueia quem NUNCA começou logo após o encerramento", () => {
    const agora = new Date("2026-03-15T18:30:00Z"); // 30min depois do fim
    expect(pesquisaAceitaAcesso(pesquisa, { jaIniciado: false, agora })).toBe(false);
  });

  it("permite quem JÁ tinha começado a concluir dentro da tolerância de 60min", () => {
    const agora = new Date("2026-03-15T18:30:00Z"); // 30min depois do fim
    expect(pesquisaAceitaAcesso(pesquisa, { jaIniciado: true, agora })).toBe(true);
  });

  it("bloqueia até quem já tinha começado, passada a tolerância", () => {
    const agora = new Date("2026-03-15T19:01:00Z"); // 61min depois do fim
    expect(pesquisaAceitaAcesso(pesquisa, { jaIniciado: true, agora })).toBe(false);
  });
});

describe("statusDaPesquisa — calculado pelas datas, nunca fica parado em RASCUNHO", () => {
  const pesquisa = { dataInicio: new Date("2026-03-01T09:00:00Z"), dataFim: new Date("2026-03-15T18:00:00Z") };
  const em = (iso: string, codigosGerados = true) => statusDaPesquisa(pesquisa, { codigosGerados, agora: new Date(iso) });

  it("sem códigos gerados é rascunho, mesmo dentro do período", () => {
    expect(em("2026-03-05T12:00:00Z", false)).toBe("RASCUNHO");
  });

  it("com códigos e antes do início é agendada", () => {
    expect(em("2026-02-28T23:59:00Z")).toBe("AGENDADA");
  });

  it("no instante do início e até o encerramento é aberta", () => {
    expect(em("2026-03-01T09:00:00Z")).toBe("ABERTA");
    expect(em("2026-03-15T18:00:00Z")).toBe("ABERTA");
  });

  it("depois do encerramento é encerrada, com ou sem códigos", () => {
    expect(em("2026-03-15T18:00:01Z")).toBe("ENCERRADA");
    expect(em("2026-03-15T18:00:01Z", false)).toBe("ENCERRADA");
  });

  it("aberta exatamente quando a pesquisa aceita acesso de quem ainda não começou", () => {
    for (const iso of ["2026-02-28T23:59:00Z", "2026-03-01T09:00:00Z", "2026-03-10T00:00:00Z", "2026-03-15T18:00:00Z", "2026-03-16T00:00:00Z"]) {
      const agora = new Date(iso);
      expect(statusDaPesquisa(pesquisa, { codigosGerados: true, agora }) === "ABERTA").toBe(
        pesquisaAceitaAcesso(pesquisa, { jaIniciado: false, agora }),
      );
    }
  });
});

describe("pesquisa arquivada", () => {
  it("não aceita acesso, nem de quem já tinha começado", () => {
    const p = { dataInicio: new Date("2026-03-01T09:00:00Z"), dataFim: new Date("2026-03-15T18:00:00Z"), arquivadaEm: new Date("2026-03-05T00:00:00Z") };
    const agora = new Date("2026-03-10T12:00:00Z");
    expect(pesquisaAceitaAcesso(p, { jaIniciado: false, agora })).toBe(false);
    expect(pesquisaAceitaAcesso(p, { jaIniciado: true, agora })).toBe(false);
    expect(pesquisaAceitaAcesso({ ...p, arquivadaEm: null }, { jaIniciado: false, agora })).toBe(true);
  });
});

describe("classificarPesquisa — Abertas · Concluídas · Arquivadas", () => {
  const p = { dataFim: new Date("2026-03-15T18:00:00Z") };
  it("antes do encerramento é Aberta (rascunho, agendada ou em andamento)", () => {
    expect(classificarPesquisa(p, new Date("2026-03-01T00:00:00Z"))).toBe("ABERTAS");
    expect(classificarPesquisa(p, new Date("2026-03-15T18:00:00Z"))).toBe("ABERTAS");
  });
  it("passado o encerramento é Concluída; prorrogar a traz de volta", () => {
    expect(classificarPesquisa(p, new Date("2026-03-16T00:00:00Z"))).toBe("CONCLUIDAS");
    expect(classificarPesquisa({ dataFim: new Date("2026-04-15T18:00:00Z") }, new Date("2026-03-16T00:00:00Z"))).toBe("ABERTAS");
  });
  it("arquivada vence qualquer data", () => {
    const arq = { ...p, arquivadaEm: new Date() };
    expect(classificarPesquisa(arq, new Date("2026-03-01T00:00:00Z"))).toBe("ARQUIVADAS");
    expect(classificarPesquisa(arq, new Date("2026-09-01T00:00:00Z"))).toBe("ARQUIVADAS");
  });
});

describe("carência de 30 dias da exclusão", () => {
  const pedido = new Date("2026-05-01T12:00:00Z");
  it("libera exatamente 30 dias depois do pedido", () => {
    expect(exclusaoLiberadaEm(pedido).toISOString()).toBe("2026-05-31T12:00:00.000Z");
    expect(exclusaoDefinitivaLiberada(pedido, new Date("2026-05-31T11:59:59Z"))).toBe(false);
    expect(exclusaoDefinitivaLiberada(pedido, new Date("2026-05-31T12:00:00Z"))).toBe(true);
    expect(exclusaoDefinitivaLiberada(null)).toBe(false);
  });
});

describe("validarNovoEncerramento", () => {
  const p = { dataInicio: new Date("2026-03-01T09:00:00Z"), dataFim: new Date("2026-03-15T18:00:00Z") };
  it("aceita prorrogar, antes ou depois de iniciada", () => {
    const novo = new Date("2026-04-01T18:00:00Z");
    expect(validarNovoEncerramento(p, novo, { iniciada: false }).ok).toBe(true);
    expect(validarNovoEncerramento(p, novo, { iniciada: true }).ok).toBe(true);
  });
  it("só antecipa se ninguém começou, e nunca antes do início", () => {
    const antes = new Date("2026-03-10T18:00:00Z");
    expect(validarNovoEncerramento(p, antes, { iniciada: false }).ok).toBe(true);
    expect(validarNovoEncerramento(p, antes, { iniciada: true }).ok).toBe(false);
    expect(validarNovoEncerramento(p, new Date("2026-02-01T00:00:00Z"), { iniciada: false }).ok).toBe(false);
  });
});
