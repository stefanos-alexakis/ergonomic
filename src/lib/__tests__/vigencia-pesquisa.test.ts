import { describe, expect, it } from "vitest";
import { pesquisaAceitaAcesso } from "@/lib/vigencia-pesquisa";

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
