import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { parsePlanilhaOcorrencias, LINHAS_MAXIMAS } from "@/lib/planilha-eixo3";
import { CABECALHO_OCORRENCIAS, gerarPlanilhaModeloEixo3 } from "@/lib/planilha-modelo-eixo3";

async function planilha(linhas: unknown[][], cabecalho: string[] = CABECALHO_OCORRENCIAS, aba = "Ocorrências") {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(aba);
  sheet.addRow(cabecalho);
  for (const l of linhas) sheet.addRow(l);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("parsePlanilhaOcorrencias", () => {
  it("lê o padrão da cliente, normalizando CID, relação e data", async () => {
    const buf = await planilha([
      ["Produção", "f43.2", "Adaptação", new Date(Date.UTC(2025, 2, 15)), 10, "Sim", "Metas"],
      ["Administrativo", "F41.1", null, "02/04/2025", "3", "NÃO", null],
      ["Logística", "F 32", "Depressão", null, null, "Inconclusivo", null],
    ]);
    const r = await parsePlanilhaOcorrencias(buf);
    expect(r.erros).toEqual([]);
    expect(r.linhas.map((l) => [l.setor, l.cid, l.relacao, l.diasAfastados])).toEqual([
      ["Produção", "F43.2", "SIM", 10],
      ["Administrativo", "F41.1", "NAO", 3],
      ["Logística", "F32", "INCONCLUSIVO", null],
    ]);
    expect(r.linhas[1]!.dataInicio?.toISOString().slice(0, 10)).toBe("2025-04-02");
    expect(r.avisos.some((a) => a.linha === 4 && /Sem data/.test(a.mensagem))).toBe(true);
  });

  it("ignora as linhas do modelo que só têm 'Relação' pré-preenchida", async () => {
    const buf = await planilha([
      [null, null, null, null, null, "Sim", null],
      [null, null, null, null, null, "Inconclusivo", null],
    ]);
    const r = await parsePlanilhaOcorrencias(buf);
    expect(r).toMatchObject({ linhas: [], erros: [] });
  });

  it("aponta erro por linha e coluna: CID fora do capítulo F, relação inválida, dias negativos", async () => {
    const buf = await planilha([
      ["Produção", "M54.5", null, null, 2, "Sim", null],
      ["Produção", "F41", null, null, -1, "talvez", null],
      [null, "F32", null, null, null, "Sim", null],
    ]);
    const r = await parsePlanilhaOcorrencias(buf);
    expect(r.linhas).toEqual([]);
    expect(r.erros.map((e) => [e.linha, e.coluna])).toEqual([
      [2, "CID-F"],
      [3, "Relação com o trabalho?"],
      [3, "Total de dias afastados"],
      [4, "Setor ou GHE"],
    ]);
  });

  it("recusa cabeçalho sem as colunas obrigatórias", async () => {
    const r = await parsePlanilhaOcorrencias(await planilha([["Produção", "F41"]], ["Setor", "CID"]));
    expect(r.erros[0]?.mensagem).toMatch(/Relação com o trabalho/);
  });

  it("ignora coluna com identificação do trabalhador e avisa (LGPD)", async () => {
    const buf = await planilha([["João Silva", "Produção", "F41", "Sim"]], ["Nome do colaborador", "Setor", "CID-F", "Relação com o trabalho?"]);
    const r = await parsePlanilhaOcorrencias(buf);
    expect(r.erros).toEqual([]);
    expect(r.linhas[0]?.setor).toBe("Produção");
    expect(JSON.stringify(r.linhas)).not.toContain("João");
    expect(r.avisos.some((a) => /identificação do trabalhador/.test(a.mensagem))).toBe(true);
  });

  it("recusa arquivo que não é .xlsx e arquivo maior que 5 MB", async () => {
    expect((await parsePlanilhaOcorrencias(Buffer.from("Setor;CID\nProdução;F41"))).erros[0]?.mensagem).toMatch(/não é uma planilha/);
    const grande = Buffer.concat([Buffer.from("PK\u0003\u0004", "binary"), Buffer.alloc(5 * 1024 * 1024 + 1)]);
    expect((await parsePlanilhaOcorrencias(grande)).erros[0]?.mensagem).toMatch(/5 MB/);
  });

  it(`recusa mais de ${LINHAS_MAXIMAS} ocorrências`, async () => {
    const linhas = Array.from({ length: LINHAS_MAXIMAS + 1 }, () => ["Produção", "F41", null, null, 1, "Sim", null]);
    const r = await parsePlanilhaOcorrencias(await planilha(linhas));
    expect(r.linhas).toEqual([]);
    expect(r.erros[0]?.mensagem).toMatch(/divida/);
  });
});

describe("gerarPlanilhaModeloEixo3", () => {
  it("gera o modelo com as colunas da cliente e sem linhas de ocorrência (o parser lê zero linhas, zero erros)", async () => {
    const buf = await gerarPlanilhaModeloEixo3();
    const r = await parsePlanilhaOcorrencias(buf);
    expect(r).toMatchObject({ linhas: [], erros: [] });
  });
});
