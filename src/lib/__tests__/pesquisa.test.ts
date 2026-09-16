import { describe, expect, it } from "vitest";
import { criarPesquisa } from "@/lib/pesquisa";

// Estes três casos retornam antes de qualquer chamada ao banco — testáveis
// sem conexão real. O caminho de sucesso é coberto pelo E2E (Fase 3).
describe("criarPesquisa — validações (spec.md §4)", () => {
  const base = {
    workspaceId: "ws1",
    questionarioId: "q1",
    dataInicio: new Date("2026-01-01T09:00:00Z"),
    dataFim: new Date("2026-01-10T18:00:00Z"),
    licencasSolicitadas: 100,
  };

  it("rejeita nome vazio", async () => {
    const r = await criarPesquisa({ ...base, nome: "   " });
    expect(r.ok).toBe(false);
  });

  it("rejeita data de encerramento antes ou igual ao início", async () => {
    const r = await criarPesquisa({
      ...base,
      nome: "Pesquisa X",
      dataFim: new Date("2026-01-01T09:00:00Z"),
    });
    expect(r.ok).toBe(false);
  });

  it("rejeita quantidade de licenças zero, negativa ou fracionária", async () => {
    for (const licencas of [0, -5, 2.5]) {
      const r = await criarPesquisa({ ...base, nome: "Pesquisa X", licencasSolicitadas: licencas });
      expect(r.ok).toBe(false);
    }
  });
});
