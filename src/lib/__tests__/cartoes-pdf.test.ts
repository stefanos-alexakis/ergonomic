import { describe, expect, it } from "vitest";
import { gerarCartoesPdf } from "@/lib/cartoes-pdf";

describe("gerarCartoesPdf", () => {
  it("gera um PDF real (assinatura %PDF) com QR code embutido, sem quebrar", async () => {
    const buffer = await gerarCartoesPdf({
      pesquisaNome: "Pesquisa de Teste",
      urlBase: "https://pesquisa.agtrade.com.br/p/empresa-teste/pesquisa-teste",
      cartoes: [
        { codigo: "ABCD1234", tipo: "PARTICIPANTE" },
        { codigo: "WXYZ5678", tipo: "TESTE" },
      ],
    });

    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000); // não é um PDF vazio/corrompido
  });

  it("lida com uma lista grande de cartões (100+) sem travar", async () => {
    const cartoes = Array.from({ length: 105 }, (_, i) => ({
      codigo: `COD${String(i).padStart(5, "0")}`,
      tipo: i < 100 ? ("PARTICIPANTE" as const) : ("TESTE" as const),
    }));
    const buffer = await gerarCartoesPdf({
      pesquisaNome: "Pesquisa Grande",
      urlBase: "https://pesquisa.agtrade.com.br/p/empresa/pesquisa",
      cartoes,
    });
    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  });
});
