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

  it("gera o cabeçalho com empresa, logo e prazo de validade sem quebrar", async () => {
    // PNG 1x1 mínimo válido — só precisa ser bytes decodificáveis, o
    // teste não inspeciona pixel, só que o PDF sai íntegro com a imagem
    // embutida.
    const pngMinimo = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const buffer = await gerarCartoesPdf({
      pesquisaNome: "Pesquisa de Teste",
      urlBase: "https://pesquisa.agtrade.com.br/p/empresa-teste/pesquisa-teste",
      cartoes: [{ codigo: "ABCD1234", tipo: "PARTICIPANTE" }],
      workspaceNome: "Empresa Teste Ltda",
      dataFim: new Date("2026-12-31T18:00:00Z"),
      logo: { buffer: pngMinimo, formato: "png" },
    });

    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("gera o cabeçalho sem logo (fallback só com texto) quando o arquivo não existe/falha", async () => {
    const buffer = await gerarCartoesPdf({
      pesquisaNome: "Pesquisa de Teste",
      urlBase: "https://pesquisa.agtrade.com.br/p/empresa-teste/pesquisa-teste",
      cartoes: [{ codigo: "ABCD1234", tipo: "PARTICIPANTE" }],
      workspaceNome: "Empresa Sem Logo",
      dataFim: new Date("2026-12-31T18:00:00Z"),
      // sem `logo` — mesmo caminho que route.ts usa quando carregarLogo() falha
    });

    expect(buffer.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
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
